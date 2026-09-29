import { h } from "vue";

import stateStore from "@/core/store/index";

import { newRec } from "@/core/db";
import { openPanel } from "@/core/layouts";
import { toastError } from '@/core/helpers/toastify';


import ViewCISZ from './components/ViewCISZ/index.vue';
import HtmlCISZ from './components/HtmlCISZ/index.vue'
import PatientInfo from "./PatientInfo/index.vue"
import { clientCISZ } from "./ClientCISZ"

import FindPatients from "./finds/FindPatients.vue";
import FindLocation from "./finds/FindLocation.vue";
import FindContragent from "./finds/FindContragent.vue";
import FindEmployees from "./finds/FindEmployees.vue";
import FindMedicaments from "./finds/FindMedicaments.vue";
import FindRelatedPerson from "./finds/FindRelatedPerson.vue";

import { parseResource } from "./api";

export * from './routes';

export async function createFromResurce(resource: any) {
    const response: any = await parseResource(resource);

    if (response.complete) {
        const { table, data } = response.data;

        await newRec(table, data);
    } else {
        toastError(response.message);
    }
}

export async function openReference(reference: string, html = false) {
    const client = clientCISZ();

    if (html) {
        viewHTML(reference);
    } else {
        stateStore.state.load = true;
        try {
            const resource = await client.request(reference);
            const patientRef = resource?.subject?.reference || (reference.startsWith('Patient/') ? reference.split('/').slice(0, 2).join('/') : null);

            await client.resolveDisplayNames(resource, patientRef);

            viewResource(resource);
        } finally {
            stateStore.state.load = false;
        }
    }
}

export function viewHTML(html: any) {
    openPanel({
        caption: 'Информация из ЦИСЗ',
        width: '80%',
        onCreate: (panel: any) => ({ component: h(HtmlCISZ, { html }) }),
        onClose: (data: any) => { }
    })
}

export function viewResource(resource: any) {
    openPanel({
        caption: 'Информация из ЦИСЗ',
        width: '80%',
        onCreate: (panel: any) => ({ component: h(ViewCISZ, { resource }) }),
        onClose: (data: any) => { }
    })
}

export async function patientSummaryInfo(defaults: any = {}) {
    openPanel({
        width: '80%',
        caption: 'Сводная информация по пациенту',
        onCreate: (panel: any) => {
            return {
                component: h(
                    PatientInfo,
                    {
                        panel,
                        defaults
                    }
                )
            };
        }
    })
}

export async function findFindRelatedPerson(defaults: any = {}, select = false) {
    return new Promise((resolve) => {
        openPanel({
            modal: true,
            width: '80%',
            caption: 'Поиск контактного лица пациента',
            onCreate: (panel: any) => {
                const buttons = [];

                if (select) {
                    buttons.push({
                        select: {
                            class: "btn btn-action",
                            caption: 'Выбрать',
                            onClick: () => {
                                const data = panel.ref.store.currentData();

                                if (data) panel.close(data);
                            }
                        }
                    })
                }

                return { component: h(FindRelatedPerson, { panel, select, defaults }), buttons }
            },
            onClose: (data: any) => resolve(data)
        })
    })
}

export async function findEmployees(defaults: any = {}, select = false) {
    return new Promise((resolve) => {
        openPanel({
            modal: true,
            width: '80%',
            caption: 'Поиск сотрудника',
            onCreate: (panel: any) => {
                const buttons = [];

                if (select) {
                    buttons.push({
                        select: {
                            class: "btn btn-action",
                            caption: 'Выбрать',
                            onClick: () => {
                                const data = panel.ref.store.currentData();

                                if (data) panel.close(data);
                            }
                        }
                    })
                }

                return { component: h(FindEmployees, { panel, select, defaults }), buttons }
            },
            onClose: (data: any) => resolve(data)
        })
    })
}

export async function findMedicaments(defaults: any = {}, select = false) {
    return new Promise((resolve) => {
        openPanel({
            modal: true,
            width: '900px',
            caption: 'Поиск лекарственных средств',
            onCreate: (panel: any) => {
                const buttons = [];

                if (select) {
                    buttons.push({
                        select: {
                            class: "btn btn-action",
                            caption: 'Выбрать',
                            onClick: () => {
                                const data = panel.ref.store.currentData();

                                if (data) panel.close(data);
                            }
                        }
                    })
                }

                return { component: h(FindMedicaments, { panel, select, defaults }), buttons }
            },
            onClose: (data: any) => resolve(data)
        })
    })
}

export async function findContragents(defaults: any = {}, select = false) {
    return new Promise((resolve) => {
        openPanel({
            modal: true,
            width: '80%',
            caption: 'Поиск организации',
            onCreate: (panel: any) => {
                const buttons = [];

                if (select) {
                    buttons.push({
                        select: select ? {
                            class: "btn btn-action",
                            caption: 'Выбрать',
                            onClick: () => {
                                const data = panel.ref.store.currentData();

                                if (data) panel.close(data.data);
                            }
                        } : undefined
                    })
                }

                return { component: h(FindContragent, { panel, select, defaults }), buttons }
            },
            onClose: (data: any) => resolve(data)
        })
    })
}

export async function findLocation(defaults: any = {}, select = false) {
    return new Promise((resolve) => {
        openPanel({
            modal: true,
            width: '80%',
            caption: 'Поиск отделения',
            onCreate: (panel: any) => {
                const buttons = [];

                if (select) {
                    buttons.push({
                        select: select ? {
                            class: "btn btn-action",
                            caption: 'Выбрать',
                            onClick: () => {
                                const data = panel.ref.store.currentData();

                                if (data) panel.close(data.data);
                            }
                        } : undefined
                    })
                }

                return { component: h(FindLocation, { panel, select, defaults }), buttons }
            },
            onClose: (data: any) => resolve(data)
        })
    })
}

export async function findPatients(defaults: any = {}, select = false, notFound = false) {
    return new Promise((resolve) => {
        openPanel({
            modal: true,
            width: '80%',
            caption: 'Поиск пациента',
            onCreate: (panel: any) => {
                const buttons = [];

                buttons.push({
                    notFound: notFound ? {
                        class: "btn btn-action",
                        caption: 'Пациент не найден',
                        onClick: () => panel.close(false)
                    } : undefined,
                    select: select ? {
                        class: "btn btn-action",
                        caption: 'Выбрать',
                        onClick: () => {
                            const data = panel.ref.store.currentData();

                            if (data) panel.close(data.data);
                        }
                    } : undefined
                })

                return { component: h(FindPatients, { panel, select, defaults }), buttons }
            },
            onClose: (data: any) => resolve(data)
        })
    })
}

export async function loadReference(reference: string) {
    const client = clientCISZ();

    try {
        const resource = await client.request(reference);
        const patientRef = resource?.subject?.reference || (reference.startsWith('Patient/') ? reference.split('/').slice(0, 2).join('/') : null);

        await client.resolveDisplayNames(resource, patientRef);

        return resource;
    } catch (error) {
        return null;
    }
}
