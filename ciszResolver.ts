import { CISZ_SCHEMA } from './cisz.schema';


export function getResourceTitle(r: any): string {
    return CISZ_SCHEMA[r?.resourceType]?.title?.(r) || 'Ссылка';
}

export function buildFHIRUrl(
    reference: string,
    patientRef: string | null = null,
    organizationRef: string | null = null
): string {
    if (!reference || !reference.includes('/')) return reference;

    const [resourceType] = reference.split('/');
    const meta = CISZ_SCHEMA[resourceType];

    if (!meta || meta.scope === 'root') {
        return reference;
    }

    if (meta.scope === 'organization') {
        if (reference.startsWith('Organization/')) return reference;
        return organizationRef ? `${organizationRef}/${reference}` : reference;
    }

    if (meta.scope === 'patient') {
        if (reference.startsWith('Patient/')) return reference;
        return patientRef ? `${patientRef}/${reference}` : reference;
    }

    return reference;
}

export function isEagerPath(resourceType: string, path: string): boolean {
    const meta = CISZ_SCHEMA[resourceType];

    return meta?.eager?.includes(path) || false;
}


function toRefString(val: any): string | null {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val.reference === 'string') return val.reference;
    if (typeof val.reference === 'object' && val.reference) return toRefString(val.reference);

    return null;
}

export function extractPatientRef(r: any): string | null {
    if (!r || typeof r !== 'object') return null;

    if (r.resourceType) {
        const meta = CISZ_SCHEMA[r.resourceType];
        if (meta?.getPatientRef) {
            const ref = meta.getPatientRef(r);
            if (ref?.startsWith('Patient/')) return ref;
        }
    }

    if (r.resourceType === 'Patient' && r.id) {
        return `Patient/${r.id}`;
    }

    const fallbackFields = [r.subject, r.patient];
    for (const field of fallbackFields) {
        if (!field) continue;
        const items = Array.isArray(field) ? field : [field];
        for (const item of items) {
            const ref = toRefString(item);
            if (ref?.startsWith('Patient/')) return ref;
        }
    }

    return null;
}

export function extractOrganizationRef(r: any): string | null {
    if (!r || typeof r !== 'object') return null;

    if (r.resourceType) {
        const meta = CISZ_SCHEMA[r.resourceType];
        if (meta?.getOrganizationRef) {
            const ref = meta.getOrganizationRef(r);
            if (ref?.startsWith('Organization/')) return ref;
        }
    }

    if (r.resourceType === 'Organization' && r.id) {
        return `Organization/${r.id}`;
    }

    const directFields = [
        r.managingOrganization,
        r.serviceProvider,
        r.custodian,
        r.owner,
        r.providedBy,
        r.authority
    ];

    for (const field of directFields) {
        const ref = toRefString(field);
        if (ref?.startsWith('Organization/')) return ref;
    }

    if (r.performer) {
        const performers = Array.isArray(r.performer) ? r.performer : [r.performer];

        for (const p of performers) {
            // В performer ссылка может лежать прямо в p, либо в p.actor, либо в p.onBehalfOf
            const candidates = [p, p?.actor, p?.onBehalfOf];
            for (const cand of candidates) {
                const ref = toRefString(cand);
                if (ref?.startsWith('Organization/')) return ref;
            }
        }
    }

    if (r.resourceType !== 'Patient' && r.resourceType !== 'Practitioner' && r.resourceType !== 'RelatedPerson') {
        const idents = Array.isArray(r.identifier) ? r.identifier : (r.identifier ? [r.identifier] : []);
        for (const ident of idents) {
            const ref = toRefString(ident?.assigner);
            if (ref?.startsWith('Organization/')) return ref;
        }
    }

    if (Array.isArray(r.extension)) {
        const orgExt = r.extension.find((e: any) => 
            e.url?.includes('Organization') || e.url?.includes('FromOrg')
        );
        const ref = toRefString(orgExt?.valueReference);
        if (ref?.startsWith('Organization/')) return ref;
    }

    return null;
}