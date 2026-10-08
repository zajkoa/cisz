import stateStore from "@/core/store/index";
import { decodeJwtToken } from "@/core/helpers/Token";
import { isArray } from "@/core/helpers/utils";
import { buildFHIRUrl, isEagerPath, getResourceTitle, extractPatientRef, extractOrganizationRef } from "./ciszResolver";

interface CISZConfig {
    /**
     * идентификатор клиентского приложения, соответствующий системе, например mapwebserver
     */
    clientId: string;

    /**
     * адрес (URL) обратного перенаправления при входе (URL-encoded), например http://localhost:8097/map/login
     * Убрать!!!!!
     */
    redirectUri: string;

    /**
     * адрес (URL) обратного перенаправления при входе (URL-encoded), например http://localhost:8097/map/login
     */
    redirectLoginUri: string;

    /**
     * адрес (URL) обратного перенаправления при выходе (URL-encoded), например http://localhost:8097/map/logout
     */
    redirectLogoutUri: string;

    /**
     * URL-адрес для авторизации в ЦИСЗ, например https://pp.cisz.by/auth/api/realms/iehr
     */
    authBaseUri: string;

    /**
     * URL-адрес для обмена медицинскими данными о пациенте между участниками информационного взаимодействия с ЦИСЗ, например https://pp.cisz.by/api/fhir
     */
    fhirBaseUri: string;

    /**
     * URL-адрес для работы с медицинской нормативно-справочной информацией ЦИСЗ, например https://pp.cisz.by/api/fhir/term
     */
    termBaseUri: string;

    /**
    * область разрешений для клиентского приложения, например openid realm email organization_id practitioner_id term_audience unp iehr_audience roles
    */
    scope: string;

    /**
     * Origin, например http://localhost:8097
     */
    origin: string;

    organizationId: string;

    version: string;
}

class ClientCISZ {
    protected decodeToken: any;

    constructor(public readonly config: CISZConfig) { }

    get organizationId(): string | null {
        return localStorage.getItem('cisz_organization_id');
    }

    get practitionerId(): string | null {
        return localStorage.getItem('cisz_practitioner_id');
    }

    get practitionerRole(): string | null {
        return localStorage.getItem('cisz_practitioner_role');
    }

    get token(): string | null {
        return localStorage.getItem('cisz_access_token');
    }

    set token(token: string) {
        localStorage.setItem('cisz_access_token', token);
    }

    get tokenData() {
        const token: any = this.token;

        return decodeJwtToken(token);
    }

    get tokenRefresh(): any {
        return localStorage.getItem('cisz_refresh_token');
    }

    set tokenRefresh(token: string) {
        localStorage.setItem('cisz_refresh_token', token);
    }

    base64URLEncode(data: string) {
        return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');
    }

    async pkcePair() {
        const random = crypto.getRandomValues(new Uint8Array(32));

        const code_verifier = this.base64URLEncode(String.fromCharCode(...random));

        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code_verifier));

        const code_challenge = this.base64URLEncode(String.fromCharCode(...new Uint8Array(digest)));

        return { code_verifier, code_challenge };
    }

    async login() {
        const path = window.location.pathname + window.location.search;
        const { code_verifier, code_challenge } = await this.pkcePair();

        const { clientId: client_id, redirectLoginUri: redirect_uri, authBaseUri, scope } = this.config;

        const state = crypto.randomUUID();

        localStorage.setItem('cisz_path', path);
        localStorage.setItem('cisz_state', state);
        localStorage.setItem('cisz_code_verifier', code_verifier);

        const authUrl = new URL(`${authBaseUri}/auth`);

        if (!client_id) {

        }

        authUrl.search = new URLSearchParams({
            response_type: 'code',
            client_id,
            redirect_uri,
            scope,
            state,
            code_challenge,
            code_challenge_method: 'S256'
        }).toString();

        window.location.href = authUrl.toString();
    }

    async loginCallback() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');
            const { clientId: client_id, redirectLoginUri: redirect_uri, authBaseUri, origin, organizationId } = this.config;

            if (error) {
                console.error('OAuth Error:', error);
                return;
            }

            if (!code) {
                throw new Error('Authorization code is missing');
            }

            const savedState = localStorage.getItem('cisz_state');

            if (state !== savedState) {
                throw new Error('Invalid state parameter');
            }

            const code_verifier = localStorage.getItem('cisz_code_verifier') || '';

            const body = new URLSearchParams({
                client_id,
                redirect_uri,
                grant_type: 'authorization_code',
                code_verifier,
                code
            }).toString();

            const response = await fetch(
                `${authBaseUri}/token`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Origin': origin
                    },
                    body
                }
            );

            if (!response.ok) {
                throw new Error(`Token exchange failed`);
            }

            const responseJson: any = await response.json()

            this.token = responseJson.access_token;
            this.tokenRefresh = responseJson.refresh_token;

            this.decodeToken = decodeJwtToken(responseJson.access_token);

            // exp (время истечения срока действия): Время истечения срока действия токена, после которого он становится недействительным.
            // iat (дата выпуска): Время выпуска токена.
            // auth_time

            const { exp, organization_id, practitioner_id, unp } = this.decodeToken;

            localStorage.setItem('cisz_exp', exp);
            localStorage.setItem('cisz_unp', unp);
            localStorage.setItem('cisz_organization_id', organization_id);
            localStorage.setItem('cisz_practitioner_id', practitioner_id);

            const data = await this.request(`PractitionerRole?practitioner=${practitioner_id}`);

            if (data.resourceType == 'Bundle') {
                for (const entry of data.entry) {
                    switch (entry.resource.resourceType) {
                        case 'PractitionerRole':
                            const [type = null, id = organization_id] = entry.resource?.organization?.reference?.split('/');

                            if (type == 'Organization') {
                                if (id == organizationId) {
                                    localStorage.setItem('cisz_practitioner_role', entry.resource.id);

                                    localStorage.setItem('cisz_organization_id', id);
                                }
                            }

                            break;

                        default:
                            break;
                    }
                }
            }

            const cisz_path: any = localStorage.getItem('cisz_path');

            localStorage.removeItem('cisz_path');
            localStorage.removeItem('cisz_state');
            localStorage.removeItem('cisz_code_verifier');

            window.location.href = cisz_path;

            return responseJson;
        } catch (error) {
            console.error('Authentication failed:', error);
        }
    }

    async loginToken(access_token: string) {
        this.token = access_token;
        this.decodeToken = decodeJwtToken(access_token);

        const { exp, organization_id, practitioner_id, unp } = this.decodeToken;

        localStorage.setItem('cisz_exp', exp);
        localStorage.setItem('cisz_unp', unp);
        localStorage.setItem('cisz_organization_id', organization_id);
        localStorage.setItem('cisz_practitioner_id', practitioner_id);

        const data = await this.request(`PractitionerRole?practitioner=${practitioner_id}`);

        if (data.resourceType == 'Bundle') {
            for (const entry of data.entry) {
                switch (entry.resource.resourceType) {
                    case 'PractitionerRole':
                        localStorage.setItem('cisz_practitioner_role', entry.resource.id);

                        const [type = null, id = organization_id] = entry.resource?.organization?.reference?.split('/');

                        if (type == 'Organization') {
                            localStorage.setItem('cisz_organization_id', id);
                        }

                        break;

                    default:
                        break;
                }
            }
        }

        localStorage.removeItem('cisz_path');
        localStorage.removeItem('cisz_state');
        localStorage.removeItem('cisz_code_verifier');
    }

    async request(endpoint: string, options: any = {}): Promise<any> {
        const { fhirBaseUri, origin } = this.config;

        if (this.token) {
            const headers = {
                'Authorization': `Bearer ${this.token}`,
                // 'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin,
                'Origin': origin,
                'cache': "no-store",
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                ...options.headers
            };

            stateStore.state.load = true;

            const url = endpoint.toUpperCase().startsWith(fhirBaseUri.toUpperCase()) ? endpoint : `${fhirBaseUri}/${endpoint}`;

            const params = {
                'cache': "no-store",
                ...options,
                headers
            }

            const response = await fetch(url, params);

            stateStore.state.load = false;

            if (response.status === 401) {
                const refreshed = await this.refreshToken();

                if (refreshed) {
                    return this.request(endpoint, options);
                } else {
                    this.login();

                    return;
                }
            }

            return headers['Accept'] == 'text/html' ? response.text() : response.json();
        } else {
            await this.login();
        }
    }

    async refreshToken() {
        const { clientId: client_id, authBaseUri } = this.config;
        if (this.tokenRefresh) {
            try {
                const body = new URLSearchParams({
                    client_id,
                    refresh_token: this.tokenRefresh,
                    grant_type: 'refresh_token'
                }).toString();

                const response = await fetch(
                    `${authBaseUri}/token`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body
                    }
                );

                if (!response.ok) throw new Error('Refresh failed');

                const responseJson = await response.json();

                localStorage.setItem('cisz_access_token', responseJson.access_token);
                localStorage.setItem('cisz_refresh_token', responseJson.refresh_token);

                return true;
            } catch (error) {
                console.error('Token refresh error:', error);

                return false;
            }
        } else {
            await this.login();
        }
    }

    async sign(data: string) {
        const response = await fetch(
            'http://127.0.0.1:8084/sign',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data })
            }
        )

        return response.json();
    }

    async importBundle(body: string) {
        const { fhirBaseUri, origin, version } = this.config;

        const init = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/cms',
                'Authorization': `Bearer ${this.token}`,
                'X-fhir-by-Version': version,
                'Origin': origin
            },
            body
        }

        const response = await fetch(`${fhirBaseUri}/Bundle/$import`, init);

        return response.json();
    }

    async validateBundle(body: string) {
        const { fhirBaseUri, origin, version } = this.config;

        const init = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/cms',
                'Authorization': `Bearer ${this.token}`,
                'X-fhir-by-Version': version,
                'Origin': origin
            },
            body
        }

        const response = await fetch(`${fhirBaseUri}/Bundle/$validate`, init);

        return response.json();
    }

    async statusBundle(id: string) {
        const { fhirBaseUri, origin, version } = this.config;

        const init = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'X-fhir-by-Version': version,
                'Origin': origin
            }
        }

        const response = await fetch(`${fhirBaseUri}/Bundle/${id}/$status`, init);

        return response.json();
    }

    async cancelBundle(id: string) {
        const { fhirBaseUri, origin, version } = this.config;

        const init = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'X-fhir-by-Version': version,
                'Origin': origin
            }
        }

        const response = await fetch(`${fhirBaseUri}/Bundle/${id}/$cancel`, init);

        return response.json();
    }

    readResult(data: any) {
        const result: any = {
            complete: false,
            message: '',
            data: {}
        }

        if (data.resourceType == 'OperationOutcome') {
            for (const issue of data.issue) {
                const { severity, code, diagnostics } = issue;

                if (severity == 'information') {
                    if (code == "informational" && diagnostics == "All OK") {
                        result.complete = true;
                        result.message = diagnostics;

                        break;
                    }
                }

                if (severity == 'error') {
                    result.complete = true;
                    result.message = diagnostics;

                    break;
                }
            }
        }

        if (data.resourceType == 'Parameters') {
            result.complete = true;

            for (const parameter of data.parameter) {
                const { name } = parameter;

                switch (name) {
                    case 'ResourceId': {
                        const { valueString } = parameter;

                        Object.assign(result.data, { ResourceId: valueString })
                    }

                        break;

                    case 'ProcessingStatus': {
                        const { valueString } = parameter;

                        Object.assign(result.data, { ProcessingStatus: valueString })
                    }

                        break;

                    default:
                        break;
                }
            }
        }

        return result;
    }

    async logout() {
        if (this.tokenRefresh) {
            const path = window.location.pathname + window.location.search;

            localStorage.setItem('cisz_path', path);

            const { clientId, authBaseUri, redirectLogoutUri } = this.config;

            const authUrl = new URL(`${authBaseUri}/logout`);

            authUrl.search = new URLSearchParams({
                token: this.tokenRefresh,
                token_type_hint: 'refresh_token',
                client_id: clientId,
                post_logout_redirect_uri: redirectLogoutUri
            }).toString();

            window.location.href = authUrl.toString();
        }
    }

    async loadReference(obj: any, patient: any = null) {
        if (typeof obj == 'object') {
            if (isArray(obj)) {
                for (const item of obj) {
                    await this.loadReference(item, patient);
                }
            } else {
                if ('reference' in obj) {
                    if (typeof obj.reference == 'object' && obj.reference) {
                        await this.loadReference(obj.reference, patient);
                    } else {
                        obj.resource = patient ? await this.request(`${patient}/${obj.reference}`) : await this.request(obj.reference);
                    }
                }
            }
        }
    }

    async resolveDisplayNames(
        resource: any,
        patientRef: string | null = null,
        organizationRef: string | null = null,
        currentPath = '',
        parentType = '',
        visited = new Set()
    ) {
        if (!resource || typeof resource !== 'object') return;
        if (visited.has(resource)) return;
        visited.add(resource);

        const activePatient = extractPatientRef(resource) || patientRef;

        const activeOrganization = extractOrganizationRef(resource)
            || organizationRef
            || (this.organizationId ? `Organization/${this.organizationId}` : null);

        const currentType = resource.resourceType || parentType;

        if (Array.isArray(resource)) {
            await Promise.allSettled(
                resource.map(item => this.resolveDisplayNames(item, activePatient, activeOrganization, currentPath, currentType, visited))
            );
            return;
        }

        if ('reference' in resource && typeof resource.reference === 'string') {
            const isEager = currentType ? isEagerPath(currentType, currentPath) : false;
            const needsLoad = !resource.display || (isEager && !resource.resource);

            if (needsLoad) {
                const url = buildFHIRUrl(resource.reference, activePatient, activeOrganization);
                try {
                    const fetched = await this.request(url);
                    if (fetched && !fetched.issue) {
                        resource.resource = fetched;
                        resource.display = resource.display || getResourceTitle(fetched);
                    } else {
                        resource.display = resource.display || 'Ссылка';
                    }
                } catch (e) {
                    resource.display = resource.display || 'Ссылка';
                }
            }
        }

        const promises = [];
        for (const key of Object.keys(resource)) {
            if (key === 'resource' && 'reference' in resource) continue;

            promises.push(
                this.resolveDisplayNames(resource[key], activePatient, activeOrganization, key, currentType, visited)
            );
        }
        await Promise.allSettled(promises);
    }
}

export function clientCISZ() {
    const { cisz }: any = stateStore.state.constants;

    const { clientId, origin, fhirBaseUri, termBaseUri, redirectUri, redirectLoginUri, redirectLogoutUri, authBaseUri, scope, organizationId, version } = cisz;

    return new ClientCISZ({ clientId, origin, fhirBaseUri, termBaseUri, redirectUri, redirectLoginUri, redirectLogoutUri, authBaseUri, scope, organizationId, version });
}
