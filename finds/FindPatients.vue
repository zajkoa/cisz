<template>
	<DBForm :store="storeParams" ref="form">
		<template v-slot="form">
			<div class="form-row">
				<div class="col-5">
					<DBEdit :form="form" field="name" clear />
				</div>
				<div class="col-3">
					<DBEdit :form="form" field="dateofbirth" clear />
				</div>
				<div class="col-4">
					<DBEdit :form="form" field="personal_number" clear />
				</div>
			</div>
		</template>
	</DBForm>

	<DBGrid :store="store" :config="config" @select="data => onSelect(data)" ref="grid"></DBGrid>
</template>

<script>
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';

import bus from '@/core/bus';
import DBStore from '@/core/db_store';
import DBStoreRecord from '@/core/db_store_record';
import { toastError } from '@/core/helpers/toastify';

import { clientCISZ } from '../ClientCISZ';
import { parseResource } from '../api';
import { createFromResurce, openReference } from '../index';

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
					personal_number: {
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
				data: {
					description: "Данные",
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
				patient: async (data) => {
					const { id, resourceType } = data.resource;

					await openReference(`${resourceType}/${id}`);
				}
			}
		}

		const store = new DBStore('find_patients', config);
		store.model.offLine = true;

		const onSelect = async (data) => {
			if (data) {
				if (select) {
					panel.close(data.data);
				} else {
					await createFromResurce(data.resource);
				}
			}
		}

		const onSaveData = async (saveData) => {
			const { table, newrecord, data } = saveData;

			if (table == "patients") {
				if (newrecord) {
					panel.close(data);
				}
			}
		}

		onMounted(async () => {
			bus.$on('save-data', onSaveData);

			await storeParams.defaultsData(defaults);

			grid.value.controller.createPanelFun([
				{
					find: {
						caption: 'Поиск',
						title: 'Поиск',
						class: 'btn btn-add',
						onClick: async () => {
							store.clear();

							const params = [];

							if (await form.value.validation()) {
								const { name, personal_number, dateofbirth } = storeParams.data;

								let identifiers = 0;

								if (personal_number) {
									identifiers += 2;
									params.push(`identifier=${personal_number.trim()}`);
								}

								if (name) {
									identifiers += 1;
									params.push(`name=${name.trim()}`);
								}

								if (dateofbirth) {
									identifiers += 1;
									params.push(`birthdate=${dateofbirth}`);
								}

								if (identifiers > 1) {
									const data = await client.request(`Patient?${params.join('&')}`);

									if (data) {
										if (data.resourceType == 'Bundle') {
											let found = false;
											const { entry = [] } = data;

											for (const resource of entry) {
												if (resource.resource.resourceType == 'Patient') {
													found = true;

													const response = await parseResource(resource.resource);

													if (response.complete) {
														const { data } = response.data;

														store.push({ data, patient: data.name, dateofbirth: data.dateofbirth, resource: resource.resource });
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
									}
								} else {
									toastError('Необходимо ввести более одного параметра для поиска!');
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