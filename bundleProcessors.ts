import { query } from "@/core/components/DB/api";
import { getPatientReference } from "@/cisz/api";

async function processHpl(ciszData: any, client: any) {
    const hplId = ciszData.document_ref;

    try {
        const hplRes = await query({
            table: 'hpl',
            method: 'object',
            data: { id: hplId }
        });

        if (!hplRes.complete || !hplRes.data) {
            return;
        }

        const hplRecord = hplRes.data;

        const movements = hplRecord.movements;
        if (!movements || movements.length === 0) {
            return;
        }

        movements.sort((a: any, b: any) => new Date(a.time_adm).getTime() - new Date(b.time_adm).getTime());
        const firstMovement = movements[0];

        const patientRef = await getPatientReference(ciszData.id);
        if (!patientRef || !patientRef.reference) {
            return;
        }

        const identifier = hplRecord.name_reg;
        const url = `${patientRef.reference}/EpisodeOfCare?identifier=${identifier}&_profile=https://fhir.by/StructureDefinition/Hospitalisation`;
        
        const searchResult = await client.request(url);

        if (searchResult?.resourceType === 'Bundle' && searchResult.entry?.length > 0) {
            const episodes = searchResult.entry
                .map((e: any) => e.resource)
                .filter((r: any) => r?.resourceType === 'EpisodeOfCare');
            

            if (episodes.length > 0) {
                episodes.sort((a: any, b: any) => {
                    const dateA = new Date(a.meta?.lastUpdated || 0).getTime();
                    const dateB = new Date(b.meta?.lastUpdated || 0).getTime();
                    return dateB - dateA;
                });

                const latestEpisode = episodes[0];

                if (latestEpisode?.id) {
                    
                    await query({
                        table: 'hpl_movements',
                        method: 'save',
                        data: {
                            id: firstMovement.id,
                            reference: `EpisodeOfCare/${latestEpisode.id}`
                        }
                    });
                    
                }
            }
        }
    } catch (err) {
    }
}

const PROCESSORS: Record<string, Function> = {
    'hpl': processHpl,
};

export async function runBundleProcessors(ciszId: string, client: any) {
    try {
        const ciszRes = await query({
            table: 'cisz',
            method: 'read',
            params: { filters: [{ field: '"cisz"."id"', value: ciszId }] }
        });
        
        if (!ciszRes.complete || ciszRes.data.rows.length === 0) {
            return;
        }
        const ciszData = ciszRes.data.rows[0];
        
        if (!ciszData.document) {
            return;
        }
        
        const [table] = ciszData.document.split('|');
        
        const processor = PROCESSORS[table];
        if (processor) {
            await processor(ciszData, client);
        }
    } catch (e) {
    }
}