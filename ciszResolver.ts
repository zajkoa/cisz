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

    if (r.resourceType === 'Patient' && r.id) return `Patient/${r.id}`;

    if (r.subject) {
        const subjects = Array.isArray(r.subject) ? r.subject : [r.subject];
        for (const s of subjects) {
            const ref = toRefString(s);
            if (ref?.startsWith('Patient/')) return ref;
        }
    }

    if (r.patient) {
        const ref = toRefString(r.patient);
        if (ref?.startsWith('Patient/')) return ref;
    }

    return null;
}

export function extractOrganizationRef(r: any): string | null {
    if (!r || typeof r !== 'object') return null;
    if (r.resourceType === 'Organization' && r.id) return `Organization/${r.id}`;

    if (r.performer) {
        console.log("performer")
        const performers = Array.isArray(r.performer) ? r.performer : [r.performer];
        for (const p of performers) {
            const org = toRefString(p?.actor) || toRefString(p?.reference) || toRefString(p?.onBehalfOf) || toRefString(p);
            if (org?.startsWith('Organization/')) return org;
        }
    }

    const idents = Array.isArray(r.identifier) ? r.identifier : (r.identifier ? [r.identifier] : []);
    for (const ident of idents) {
        const assignerOrg = toRefString(ident?.assigner);
        if (assignerOrg?.startsWith('Organization/')) return assignerOrg;
    }

    const standardFields = [r.managingOrganization, r.owner, r.serviceProvider, r.custodian];
    for (const field of standardFields) {
        const org = toRefString(field);
        if (org?.startsWith('Organization/')) return org;
    }

    if (Array.isArray(r.extension)) {
        const orgExt = r.extension.find((e: any) => e.url?.includes('Organization') || e.url?.includes('FromOrg'));
        const org = toRefString(orgExt?.valueReference);
        if (org?.startsWith('Organization/')) return org;
    }

    return null;
}