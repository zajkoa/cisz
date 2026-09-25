<template>
	<DBForm :store="storeParams" ref="form">
		<template v-slot="form">
			<div class="form-row">
				<div class="col-5">
					<DBEdit :form="form" field="name" />
				</div>
				<div class="col-3">
					<DBEdit :form="form" field="dateofbirth" />
				</div>
				<div class="col-4">
					<DBEdit :form="form" field="identifier" />
				</div>
			</div>
		</template>
	</DBForm>

	<DBGrid :store="store" :config="config" @select="data => onSelect(data)" ref="grid"></DBGrid>
</template>

<script>
import { defineComponent, onMounted, onUnmounted, ref } from 'vue'

import bus from '@/core/bus';
import DBStore from '@/core/db_store';
import DBStoreRecord from '@/core/db_store_record';
import { toastError } from '@/core/helpers/toastify';

import { clientCISZ } from '../ClientCISZ';
import { viewResource } from '../api';

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
		select: {
			type: Boolean
		}
	},

	setup(props) {
		const { panel, select, defaults } = props;
		const client = clientCISZ();

		const grid = ref(null);
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
					}
				}
			}
		);

		const config = {
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
				patient: {
					description: "Ф.И.О.",
					type: 'STRING'
				},
				dateofbirth: {
					description: 'Дата рождения',
					type: 'DATEONLY'
				},
				resource: {
					description: "Ресурс",
					type: 'JSON',
					config: {
						hide: true
					}
				}
			}
		}

		const store = new DBStore('find_patients', config);
		store.model.offLine = true;

		const onSelect = async (data) => {
			if (data) {
				if (select) {
					panel.close(data);
				} else {
					const patient = await viewResource(data.resource);

					// await newRec('patients', patient.data);
				}
			}
		}

		const onSaveData = async (saveData) => {
			// const { table, newrecord, data } = saveData;

			// if (table == "patients") {
			// 	if (newrecord) {
			// 		panel.close(data);
			// 	}
			// }
		}

		onMounted(async () => {
			bus.$on('save-data', onSaveData);

			await storeParams.defaultsData(defaults);

			grid.value.controller.createPanelFun([
				{
					secondary: {
						caption: 'Поиск',
						title: 'Поиск',
						class: 'btn btn-add',
						onClick: async () => {
							store.clear();

							const patient = 'Patient/pa-5b889ad8-07e6-11f1-a854-156915a18159';

							const data = await client.request(`${patient}/RelatedPerson?_profile=https://fhir.by/StructureDefinition/RelatedPersonPermanentBy&patient=${patient}`);

							if (data) {
								if (data.resourceType == 'Bundle') {
									let found = false;
									const { entry = [] } = data;

									for (const resource of entry) {
										if (resource.resource.resourceType == 'RelatedPerson') {
											found = true;

											const patient = await viewResource(resource.resource);

											store.push({ patient: patient.data.name, dateofbirth: patient.data.dateofbirth, resource: resource.resource });
										}
									}

									if (!found) toastError('Не найдена информация по контактному лицу!');
								}

								if (data.resourceType == 'OperationOutcome') {
									for (const issue of data.issue) {
										if (issue.severity == 'error') {
											toastError(issue.diagnostics);
										}
									}
								}
							}
						}
					}
				}
			]);
		})

		onUnmounted(() => {
			bus.$off('save-data', onSaveData);
		})

		return {
			onSelect,
			form,
			grid,
			store,
			config,
			storeParams
		}
	}
})
</script>