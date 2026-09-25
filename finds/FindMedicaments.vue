<template>
	<DBForm :store="storeParams" ref="form">
		<template v-slot="form">
			<div class="form-row">
				<div class="col">
					<DBEdit :form="form" field="type" radio />
				</div>
			</div>
			<div class="form-group row">
				<div class="col">
					<DBEdit :form="form" field="name" raw />
				</div>
			</div>
		</template>
	</DBForm>

	<DBGrid :store="store" :config="config" @select="data => onSelect(data)" ref="grid"></DBGrid>
</template>

<script>
import { defineComponent, onMounted, ref } from 'vue';

import DBStore from '@/core/db_store';
import DBStoreRecord from '@/core/db_store_record';

import { isRequired } from '@/core/helpers/validators';
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

		const grid = ref(null);
		const form = ref(null);

		const client = clientCISZ();

		const storeParams = new DBStoreRecord('find_medicaments_params', {
			fields: {
				type: {
					description: 'Представление лекарственного средства',
					type: {
						enum: [
							{
								id: 1,
								name: 'по торговому наименованию'
							},
							{
								id: 2,
								name: 'по международному непатентованному наименованию его компонентов'
							}
						]
					}
				},
				name: {
					description: 'Наименование',
					type: 'STRING',
					validation: {
						isRequired
					}
				}
			}
		});

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
				name: {
					description: "Наименование",
					type: 'STRING'
				},
				data: {
					description: "Ресурс",
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
					const { resourceType, id } = data.resource;

					await openReference(`${resourceType}/${id}`);
				}
			}
		}

		const store = new DBStore('find_medicaments', config);
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

		onMounted(async () => {
			await storeParams.defaultsData(defaults);

			grid.value.controller.createPanelFun([
				{
					secondary: {
						caption: 'Поиск',
						title: 'Поиск',
						class: 'btn btn-add',
						onClick: async () => {
							store.clear();

							if (await form.value.validation()) {
								const params = [];

								const { type, name } = storeParams.data;

								if (name) {
									switch (+type) {
										case 1:
											params.push(`_profile=https://fhir.by/StructureDefinition/MedicationBy`)
											params.push(`name=${name}`);

											break;

										case 2:
											params.push(`_profile=https://fhir.by/StructureDefinition/DrugComponent`)
											params.push(`ingredient=${name}`);

											break;

										default:
											break;
									}

									const data = await client.request(`Medication?${params.join('&')}`);

									if (data) {
										if (data.resourceType == 'Bundle') {
											let found = false;
											const { entry = [] } = data;

											for (const resource of entry) {
												if (resource.resource.resourceType == 'Medication') {
													found = true;

													const medication = await parseResource(resource.resource);

													if (medication.complete) {
														store.push({
															name: medication.data.data.name,
															data: medication.data.data,
															resource: resource.resource
														});
													} else {
														toastError(medication.message);
													}
												}
											}

											if (!found) toastError('Не найдена информация по лекарственному средству!');
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
					}
				}
			]);

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
