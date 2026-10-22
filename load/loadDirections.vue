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
				<div class="col-2">
					<DBEdit :form="form" field="count" />
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
import { parseResource } from '../api';
import { findContragents, openReference } from '../index';

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
		},
		type: {
			type: String,
			default: 'pgi'
		}
	},

	setup(props) {
		const { defaults, type = 'pgi' } = props;
		const isHpl = type === 'hpl';
		const table = isHpl ? 'hpl' : 'pgi';

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
					},
					count: {
						description: 'Кол-во',
						type: {
							enum: [
								{
									id: 10,
									name: '10'
								},
								{
									id: 25,
									name: '25'
								},
								{
									id: 50,
									name: '50'
								},
								{
									id: 100,
									name: '100'
								}
							]
						}
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
				status: {
					description: "Статус",
					type: {
						enum: statuses
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

		const loadDirections = async (url) => {
			storeDirections.clear();

			const { type, entry, link } = await client.request(url);

			if (type == 'searchset') {
				for (const row of entry) {
					const { resourceType } = row.resource;

					if (resourceType == 'ServiceRequest') {
						const { location, requester, reason, specimen, subject, status } = row.resource;

						await client.loadReference(location);
						await client.loadReference(requester);
						await client.loadReference(subject);

						await client.loadReference(reason, subject?.reference);
						if (specimen) await client.loadReference(specimen, subject?.reference);

						const response = await parseResource(row.resource);

						if (response.complete) {
							const docNumber = response.data.data.number_direct || response.data.data.number || '';
							const docTitle = isHpl
								? `Направление на госпитализацию № ${docNumber}`
								: `Направление на исследование № ${docNumber}`;

							const direction = {
								name: docTitle,
								location: null,
								data: null,
								resource: row.resource
							}

							const responsePGINotion = await query({ table, method: 'notion', data: response.data.data });

							if (responsePGINotion.complete) {

								responsePGINotion.data.status = isHpl ? 1 : 2;

								if (typeof responsePGINotion.data.patient == 'object') {
									direction.patient = responsePGINotion.data.patient?.name
								} else {
									direction.patient = responsePGINotion.data._patient;
								}

								direction.location = responsePGINotion.data._customer;
								direction.status = status;
								direction.date_send = responsePGINotion.data.date_send || responsePGINotion.data.time_reg;
								direction.data = responsePGINotion.data;
							}

							storeDirections.push(direction);
						} else {
							toastError(response.message);
						}
					}
				}
			}

			const buttons = [
				{
					find: {
						caption: 'Поиск',
						title: 'Поиск',
						class: 'btn btn-add',
						onClick: () => findDirections()
					}
				}
			];

			const { count } = storeParams.data;

			for (const item of link) {
				const { relation, url } = item;

				if (relation == 'next') {
					buttons.push({
						next: {
							caption: `Следующие ${count} направлений >>`,
							title: 'Следующие',
							class: 'btn btn-light',
							onClick: async () => await loadDirections(url)
						}
					})
				}
			}

			gridDirections.value.controller.createPanelFun(buttons);
		}

		const findDirections = async () => {
			const { reference, authored, count } = storeParams.data;

			const profile = isHpl
				? "https://fhir.by/StructureDefinition/ServiceRequestHospitalisation"
				: "https://fhir.by/StructureDefinition/ServiceRequestBioMatResearch";

			const params = {
				_profile: profile,
				_count: count,
				status: "active"
			}

			if (!isHpl) {
				params["code-concept"] = "patho-histology";
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

			const url = `Organization/${client.organizationId}/ServiceRequest?${Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')}`;

			await loadDirections(url);
		}

		const onSelect = (data) => { }

		onMounted(async () => {
			await storeParams.defaultsData({ count: 10, ...defaults });
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
