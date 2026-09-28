<template>
    <div class="card">
        <div class="card-body">
            <DBForm :store="store" ref="form">
                <template v-slot="form">
                    <div class="form-row">
                        <div class="col-lg-4">
                            <DBEdit :form="form" field="patient" typeahead />
                        </div>
                    </div>

                    <Tabs>
                        <Tab caption="Общая информация">
                            <div class="form-row border-bottom">
                                <div class="col-lg-2">
                                    <DBEdit :form="form" field="begin" />
                                </div>
                                <div class="col-lg-2">
                                    <DBEdit :form="form" field="end" />
                                </div>
                                <div class="col-auto mt-3">
                                    <button type="button" class="btn btn-save" @click="onFindInfo"> Поиск </button>
                                </div>
                            </div>

                            <ViewCISZ :resource="resource" :key="resource.id" v-if="resource.id"></ViewCISZ>
                        </Tab>

                        <Tab caption="Поиск по профилю">
                            <div class="form-row border-bottom">
                                <div class="col-lg-4">
                                    <DBEdit :form="form" field="section" clear />
                                </div>
                                <div class="col-lg-4">
                                    <DBEdit :form="form" field="profile" clear />
                                </div>
                                <div class="col-auto mt-3">
                                    <button type="button" class="btn btn-save" @click="onFindProfile"> Поиск </button>
                                </div>
                            </div>
                            <ViewCISZ :resource="profileResource" :key="profileResource.id" :hideTabs="true" v-if="Object.keys(profileResource).length > 0"></ViewCISZ>
                        </Tab>

                        <Tab caption="Направления на исследования">
                            <div class="form-row border-bottom">
                                <div class="col-lg-3">
                                    <DBEdit :form="form" field="profileDirection" clear />
                                </div>
                                <div class="col-lg-2">
                                    <DBEdit :form="form" field="status" clear />
                                </div>
                                <div class="col-lg-3">
                                    <DBEdit :form="form" field="contragent" selectMode />
                                </div>
                                <div class="col-lg-2">
                                    <DBEdit :form="form" field="authored" clear />
                                </div>
                                <div class="col-auto mt-3">
                                    <button type="button" class="btn btn-save" @click="onFindDirections">Поиск направлений</button>
                                </div>
                            </div>

                            <DBGrid :store="storeDirections" :config="configDirections" ref="gridDirections" readonly></DBGrid>
                        </Tab>
                    </Tabs>
                </template>
            </DBForm>
        </div>
    </div>
</template>

<script lang="jsx">
import dayjs from "dayjs";
import { reactive, ref } from 'vue';

import DBStore from '@/core/db_store';
import stateStore from "@/core/store/index";
import DBStoreRecord from '@/core/db_store_record';
import { query } from '@/core/components/DB/api';
import { toastError } from "@/core/helpers/toastify";
import { isRequired } from '@/core/helpers/validators';
import { clearObject } from '@/core/helpers/utils';
import { getStartPeriodConfig, getEndPeriodConfig } from '@/core/helpers/mixins';

import ViewCISZ from '@/cisz/components/ViewCISZ/index.vue';
import { clientCISZ } from '@/cisz/ClientCISZ';
import { parseResource } from '@/cisz/api';
import { findPatients, openReference } from '@/cisz/index';

import PROFILES from "./profiles";

const statuses = [
    {
        id: 'active',
        name: 'Активно'
    },
    {
        id: 'completed',
        name: 'Завершено'
    },
    {
        id: 'revoked',
        name: 'Отменено'
    },
    {
        id: 'entered-in-error',
        name: 'Введено по ошибке'
    }
]

const SERVICEREQUEST = [
    {
        id: "https://fhir.by/StructureDefinition/ServiceRequestBioMatResearch",
        name: "Направление на исследование биологического материала",
        statuses
    },
    {
        id: "https://fhir.by/StructureDefinition/ServiceRequestUltrasound",
        name: "Направление на ультразвуковое исследование",
        statuses
    }
];

export default {
    components: {
        ViewCISZ
    },

    props: {
        defaults: {
            type: Object,
            default: () => ({})
        }
    },

    setup(props) {
        const client = clientCISZ();

        const gridDirections = ref(null);

        const resource = reactive({});

        const form = ref(null);

        const profileResource = reactive({});

        const store = new DBStoreRecord(
            'patient_info',
            {
                fields: {
                    patient: {
                        description: 'Пациент',
                        type: {
                            reference: 'patients'
                        },
                        validation: {
                            isRequired
                        },
                        config: {
                            typeahead: {
                                table: "patients",
                                notion: (data) => {
                                    let title = data.name;
                                    if (data.dateofbirth) title += ` (${dayjs(data.dateofbirth).format('DD.MM.YYYY')})`;
                                    if (data.personal_number) title += ` ${data.personal_number}`;

                                    const notion = [data.name];

                                    if (data.dateofbirth) notion.push(`<small>(${dayjs(data.dateofbirth).format('DD.MM.YYYY')})</small>`);
                                    if (data.personal_number) notion.push(`<small>${data.personal_number}</small>`);

                                    return {
                                        title,
                                        notion: `<div>${notion.join(' ')}</div>` + (data.address_p ? `<small>${data.address_p}</small>` : '')
                                    }
                                },
                                options: {
                                    fields: ['id', 'name', 'dateofbirth', 'address_p', 'personal_number', 'reference'],
                                    limit: 10
                                }
                            },
                            onSelect: async (data) => {
                                if (data) {
                                    store.data.reference = data.reference;
                                } else {
                                    store.data.reference = null;
                                }
                            }
                        }
                    },
                    reference: {
                        description: 'Ссылка',
                        type: 'STRING',
                    },
                    begin: {
                        description: 'Начало периода',
                        type: 'DATEONLY',
                        validation: {
                            isRequired
                        },
                        config: getStartPeriodConfig((controller) => controller.data.end)
                    },
                    end: {
                        description: 'Окончание периода',
                        type: 'DATEONLY',
                        validation: {
                            isRequired
                        },
                        config: getEndPeriodConfig((controller) => controller.data.begin)
                    },
                    contragent: {
                        description: 'Организация',
                        type: {
                            reference: 'contragents'
                        },
                        config: {
                            typeahead: {
                                options: {
                                    fields: ['id', 'name', 'reference'],
                                    limit: 10
                                }
                            },
                            onSelect: async (data) => {
                                if (data) {
                                    store.data.referenceContragent = data.reference;
                                } else {
                                    store.data.referenceContragent = null;
                                }
                            }
                        }
                    },
                    authored: {
                        description: 'Дата направления',
                        type: 'DATEONLY'
                    },
                    referenceContragent: {
                        description: 'Ссылка',
                        type: 'STRING'
                    },
                    profileDirection: {
                        description: 'Профиль',
                        validation: {
                            isRequired
                        },
                        type: {
                            enum: SERVICEREQUEST
                        }
                    },
                    status: {
                        description: "Статус",
                        depends: 'profileDirection',
                        type: {
                            enum: 'statuses'
                        }
                    },
                    section: {
                        description: 'Раздел',
                        validation: {
                            isRequired
                        },
                        type: {
                            enum: PROFILES
                        }
                    },
                    profile: {
                        description: "Профиль",
                        depends: 'section',
                        validation: {
                            isRequired
                        },
                        type: {
                            enum: 'items'
                        }
                    }
                }
            }
        );

        const getPatientInfo = async (patientRef) => {
            const { begin, end } = store.data;

            stateStore.state.load = true;
            try {
                const data = await client.request(`${patientRef}/$everything?start=${begin}&end=${end}`);

                await client.resolveDisplayNames(data, patientRef);

                Object.assign(resource, data);
            } catch (e) {
                console.error('Ошибка при получении данных пациента:', e);
            } finally {
                stateStore.state.load = false;
            }
        }

        const onFindInfo = async () => {
            const { patient } = store.data;

            clearObject(resource);

            if (await form.value.validation(false, ['section', 'profile', 'profileDirection'])) {
                const patientRef = store.data.reference;

                if (patientRef) {
                    await getPatientInfo(patientRef);
                } else {
                    const responsePatient = await query({
                        table: 'patients',
                        method: 'object',
                        data: { id: patient },
                        params: { fields: ['id', 'name', 'personal_number', 'dateofbirth'] }
                    });

                    if (responsePatient.complete) {
                        if (responsePatient.data) {
                            const { id, name, personal_number, dateofbirth } = responsePatient.data;

                            const result = await findPatients({ name, personal_number, dateofbirth }, true);

                            if (typeof result == 'object') {
                                if (result == null) {
                                    return null;
                                } else {
                                    await query({
                                        table: 'patients',
                                        method: 'save',
                                        data: { id, reference: result.reference }
                                    });

                                    await getPatientInfo(result.reference);
                                }
                            }
                        }
                    }
                }
            }
        }

        const configDirections = {
            key: 'id',
            menu: false,
            view: false,
            fields: {
                id: {
                    type: 'STRING',
                    config: {
                        hide: true
                    }
                },
                name: {
                    description: "Наименование",
                    type: 'STRING'
                },
                status: {
                    description: "Статус",
                    type: {
                        enum: statuses
                    }
                },
                date_collect: {
                    description: "Дата направления",
                    type: 'DATEONLY'
                },
                location: {
                    description: "Отправитель",
                    type: 'STRING'
                },
                data: {
                    description: "Данные направления",
                    type: 'JSON',
                    config: {
                        hide: true
                    }
                },
                resource: {
                    description: "Ресурс",
                    type: 'JSON',
                    config: {
                        hide: true
                    }
                }
            },
            cellClick: {
                name: async (data) => {
                    const { id, resourceType, subject } = data.resource;

                    await openReference(`${subject.reference}/${resourceType}/${id}`);
                }
            }
        }

        const storeDirections = new DBStore('find_directions', configDirections);
        storeDirections.model.offLine = true;

        const onFindDirections = async () => {
            storeDirections.clear();

            if (await form.value.validation(false, ['section', 'profile'])) {
                const { reference, referenceContragent, authored, profileDirection, status } = store.data;

                if (profileDirection) {
                    if (reference) {
                        const params = {
                            _count: 1000,
                            // "code-concept": "patho-histology",
                            _profile: profileDirection,
                            performer: `Organization/${client.organizationId}`
                        }

                        if (referenceContragent) {
                            params['assigner'] = referenceContragent;
                        }

                        if (authored) {
                            params['authored'] = authored;
                        }

                        if (status) {
                            params['status'] = status;
                        }

                        const { type, entry } = await client.request(`${reference}/ServiceRequest?${Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')}`);

                        if (type == 'searchset') {
                            for (const row of entry) {
                                const { resourceType } = row.resource;

                                if (resourceType == 'ServiceRequest') {
                                    const { location, requester, reason, specimen, subject, status } = row.resource;

                                    await client.loadReference(location);
                                    await client.loadReference(requester);
                                    await client.loadReference(subject);

                                    await client.loadReference(reason, subject.reference);
                                    await client.loadReference(specimen, subject.reference);

                                    const response = await parseResource(row.resource);

                                    if (response.complete) {
                                        const direction = {
                                            name: `Направление на исследование № ${response.data.data.number_direct}`,
                                            location: null,
                                            data: null,
                                            resource: row.resource
                                        }

                                        const responsePGINotion = await query({ table: 'pgi', method: 'notion', data: response.data.data });

                                        if (responsePGINotion.complete) {
                                            responsePGINotion.data.status = 2;

                                            direction.location = responsePGINotion.data._customer;
                                            direction.status = status;
                                            direction.date_collect = responsePGINotion.data.date_collect;
                                            direction.data = responsePGINotion.data;
                                        }

                                        storeDirections.push(direction);
                                    } else {
                                        toastError(response.message);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        const onFindProfile = async () => {
            //6010203A001PB5
            //3140394E013PB4
            if (await form.value.validation(false, ['profileDirection'])) {
                const { reference, section, profile } = store.data;

                if (reference && section && profile) {
                    clearObject(profileResource);
                    stateStore.state.load = true;

                    try {
                        const data = await client.request(`${reference}/${section}?_count=1000&_profile=${profile}`);

                        if (data && data.resourceType == 'Bundle') {
                            await client.resolveDisplayNames(data, reference);

                            Object.assign(profileResource, data);
                        }
                    } catch (error) {
                        console.error(error);
                        console.log(error);
                        toastError("Ошибка при поиске по профилю");
                    } finally {
                        stateStore.state.load = false;
                    }
                }
            }
        }

        const { defaults } = props;

        store.loadData(defaults);

        return {
            form,
            store,
            onFindInfo,
            onFindProfile,
            onFindDirections,
            gridDirections,
            storeDirections,
            configDirections,
            resource,
            profileResource
        }
    }
}
</script>

<style></style>