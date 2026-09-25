<template>
	<DBForm :store="storeParams" ref="form">
		<template v-slot="form">
			<template v-if="reference">
				<DBGrid :store="storeDirections" :config="configDirections" @select="data => onSelect(data)" ref="gridDirections"></DBGrid>
			</template>

			<template v-else>
				<div class="form-row mb-1">
					<div class="col-5">
						<DBEdit :form="form" field="name" clear />
					</div>
					<div class="col-3">
						<DBEdit :form="form" field="dateofbirth" clear />
					</div>
					<div class="col-4">
						<DBEdit :form="form" field="identifier" clear />
					</div>
				</div>

				<DBGrid :store="storePatients" :config="configPatients" @select="data => onSelect(data)" ref="gridPatients"> </DBGrid>
			</template>
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
import { openReference } from '../index';
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
		const { panel, defaults } = props;

		const client = clientCISZ();

		const gridDirections = ref(null);
		const gridPatients = ref(null);

		const form = ref(null);

		const storeParams = new DBStoreRecord(
			'find_patients_params',
			{
				fields: {
					name: {
						description: 'ФИО',
						type: 'STRING'
					},
					identifier: {
						description: 'Идентификатор',
						type: 'STRING'
					},
					dateofbirth: {
						description: 'Дата рождения',
						type: 'DATEONLY'
					},
					reference: {
						description: 'Ссылка',
						type: 'UUID'
					}
				}
			}
		);

		const configPatients = {
			key: 'id',
			menu: false,
			view: false,
			searchpanel: false,
			height: '300px',
			selectMode: true,
			fields: {
				id: {
					type: 'GUID',
					config: {
						hide: true
					}
				},
				name: {
					description: "Ф.И.О.",
					type: 'STRING'
				},
				dateofbirth: {
					description: "Дата рождения",
					type: 'DATEONLY'
				},
				identifier: {
					description: "Идентификационный номер",
					type: "STRING"
				},
				data: {
					description: "Данные пациента",
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
			onCreate: (controller) => {
				controller.createPanelFun([
					{
						find: {
							caption: 'Поиск',
							title: 'Поиск',
							class: 'btn btn-add',
							onClick: async () => await findPatients()
						}
					}
				])
			}
		}

		const storePatients = new DBStore('find_patients', configPatients);
		storePatients.model.offLine = true;

		const configDirections = {
			key: 'id',
			menu: false,
			view: false,
			searchpanel: false,
			height: '300px',
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
							onClick: async () => {
								const { reference } = storeParams.data;

								if (reference) {
									await findConclusions(reference);
								}
							}
						}
					}
				])
			}
		}

		const storeDirections = new DBStore('find_directions', configDirections);
		storeDirections.model.offLine = true;

		const onSelect = async (data) => {
			if (data) {
				if (storeParams.data.reference) {
					panel.close(data.data);
				} else {
					storeParams.data.reference = data.data.reference;

					const { id } = defaults;

					if (id) {
						await query({
							table: 'patients',
							method: 'save',
							data: { id, reference: storeParams.data.reference }
						});
					}

					await findConclusions(storeParams.data.reference);
				}
			}
		}

		const findPatients = async () => {
			storePatients.clear();

			const params = [];

			if (await form.value.validation()) {
				const { name, identifier, dateofbirth } = storeParams.data;

				let identifiers = 0;

				if (identifier) {
					identifiers += 2;
					params.push(`identifier=${identifier}`);
				}

				if (name) {
					identifiers += 1;
					params.push(`name=${name}`);
				}

				if (dateofbirth) {
					identifiers += 1;
					params.push(`birthdate=${dateofbirth}`);
				}

				if (identifiers > 1) {
					const data = await client.request(`Patient?${params.join('&')}`);

					if (data.resourceType == 'Bundle') {
						let found = false;
						const { entry = [] } = data;

						for (const resource of entry) {
							if (resource.resource.resourceType == 'Patient') {
								found = true;
								const response = await parseResource(resource.resource);

								if (response.complete) {
									const { data } = response.data;

									storePatients.push({
										id: data.id,
										name: data.name,
										dateofbirth: data.dateofbirth,
										identifier: data.personal_number,
										data,
										resource: resource.resource
									});
								} else {
									toastError(response.message);
								}
							}
						}

						if (!found) toastError('Не найдена информация по пациенту!');
					}

					if (data.resourceType == 'OperationOutcome') {
						for (const issue of data.issue) {
							if (issue.severity == 'error') {
								toastError(issue.diagnostics);
							}
						}
					}
				} else {
					toastError('Необходимо выбрать более одного параметра для поиска!');
				}
			}
		}

		const findConclusions = async (patient) => {
			storeDirections.clear();

			const params = {
				"code-concept": "patho-histology",
				_profile: "https://fhir.by/StructureDefinition/ServiceRequestBioMatResearch",
				performer: `Organization/${client.organizationId}`,
				status: "active"
			}

			const resource = await client.request(`${patient}/ServiceRequest?${Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')}`);

			switch (resource.resourceType) {
				case 'Bundle':
					let found = false;

					for (const row of resource.entry) {
						const { resourceType } = row.resource;

						if (resourceType == 'ServiceRequest') {
							const { location, requester, reason, specimen, subject } = row.resource;

							// await client.loadReference(location);
							await client.loadReference(requester);
							await client.loadReference(subject);

							await client.loadReference(reason, subject.reference);
							await client.loadReference(specimen, subject.reference);

							found = true;

							const response = await parseResource(row.resource);

							if (response.complete) {
								const responsePGINotion = await query({ table: 'pgi', method: 'notion', data: response.data.data });

								if (responsePGINotion.complete) {
									responsePGINotion.data.status = 2;

									storeDirections.push({
										name: `Направление на исследование биологического материала № ${response.data.data.number_direct}`,
										data: responsePGINotion.data,
										location: responsePGINotion.data._customer,
										resource: row.resource
									});
								}
							} else {
								toastError(response.message);
							}
						}
					}

					if (!found) toastError('Не найдены направления по пациенту!');

					break;

				default:
					break;
			}
		}

		onMounted(async () => {
			await storeParams.defaultsData(defaults);
		})

		return {
			reference: computed(() => storeParams.data.reference),
			onSelect,
			form,
			gridPatients,
			gridDirections,
			storePatients,
			storeDirections,
			configPatients,
			configDirections,
			storeParams
		}
	}
})
</script>
