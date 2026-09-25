<template>
	<DBForm :store="storeParams" ref="form">
		<template v-slot="form">
			<div class="form-row">
				<div class="col-4">
					<DBEdit :form="form" field="contragent" selectMode />
				</div>
				<div class="col-2">
					<DBEdit :form="form" field="authored" clear />
				</div>
			</div>

			<DBGrid :store="storeDirections" :config="configDirections" @select="data => onSelect(data)" ref="gridDirections"></DBGrid>
		</template>
	</DBForm>
</template>

<script>
import { computed, defineComponent, onMounted, ref } from 'vue';

import DBStore from '@/core/db_store';
import DBStoreRecord from '@/core/db_store_record';
import { query } from '@/core/components/DB/api';
import { toastError } from '@/core/helpers/toastify';

import { clientCISZ } from '../ClientCISZ';
import { findContragents, openReference } from '../index';
import { parseResource } from '../api';

export default defineComponent({
	inheritAttrs: false,

	props: {
		panel: {
			type: Object,
			default: () => ({})
		},
		defaults: {
			type: Object,
			default: () => ({})
		}
	},

	setup(props) {
		const { defaults } = props;

		const client = clientCISZ();

		const gridDirections = ref(null);

		const form = ref(null);

		const storeParams = new DBStoreRecord(
			'find_params_directions',
			{
				fields: {
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
									storeParams.data.reference = data.reference;
								} else {
									storeParams.data.reference = null;
								}
							}
						}
					},
					authored: {
						description: 'Дата направления',
						type: 'DATEONLY'
					},
					reference: {
						description: 'Ссылка',
						type: 'STRING'
					}
				}
			}
		);

		const configDirections = {
			key: 'id',
			menu: false,
			view: false,
			height: '400px',
			rowSelect: true,
			selectMode: true,
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
				patient: {
					description: "Пациент",
					type: 'STRING'
				},
				date_send: {
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
			},
			onCreate: (controller) => {
				controller.createPanelFun([
					{
						find: {
							caption: 'Поиск',
							title: 'Поиск',
							class: 'btn btn-add',
							onClick: () => findDirections()
						}
					}
				])
			}
		}

		const storeDirections = new DBStore('find_directions', configDirections);
		storeDirections.model.offLine = true;

		const findDirections = async () => {
			storeDirections.clear();

			const { reference, authored } = storeParams.data;

			const params = {
				"code-concept": "patho-histology",
				_profile: "https://fhir.by/StructureDefinition/ServiceRequestBioMatResearch",
				_count: 1000,
				status: "active"
			}

			if (reference) {
				params['assigner'] = reference;
			} else {
				const { contragent, _contragent } = storeParams.data;

				if (contragent) {
					const data = await findContragents({ name: _contragent }, true);

					if (data) {
						const { reference } = data;

						if (reference) {
							storeParams.data['reference'] = reference;

							params['assigner'] = reference;

							await query({
								table: 'contragents',
								method: 'save',
								data: { id: contragent, reference }
							});
						}
					} else {
						return
					}
				}
			}

			if (authored) {
				params['authored'] = authored;
			}

			const { type, entry } = await client.request(`Organization/${client.organizationId}/ServiceRequest?
			${Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')}`);

			if (type == 'searchset') {
				for (const row of entry) {
					const { resourceType } = row.resource;

					if (resourceType == 'ServiceRequest') {
						const { location, requester, reason, specimen, subject } = row.resource;

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

								if (typeof responsePGINotion.data.patient == 'object') {
									direction.patient = responsePGINotion.data.patient?.name
								} else {
									direction.patient = responsePGINotion.data._patient;
								}

								direction.location = responsePGINotion.data._customer;
								direction.date_send = responsePGINotion.data.date_send;
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

		const onSelect = (data) => { }

		onMounted(async () => {
			await storeParams.defaultsData(defaults);
		})

		return {
			form,
			onSelect,
			storeParams,
			gridDirections,
			storeDirections,
			configDirections,
			reference: computed(() => storeParams.data.reference),
		}
	}
})
</script>
