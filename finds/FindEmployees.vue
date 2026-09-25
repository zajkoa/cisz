<template>
	<DBForm :store="storeParams" ref="form">
		<template v-slot="form">
			<div class="form-row">
				<div class="col">
					<DBEdit :form="form" field="name" />
				</div>
			</div>
		</template>
	</DBForm>

	<DBGrid :store="store" :config="config" @select="data => onSelect(data)" ref="grid"></DBGrid>
</template>

<script>
import { defineComponent, onMounted, ref } from 'vue'

import DBStore from '@/core/db_store';
import DBStoreRecord from '@/core/db_store_record';
import { newRec } from '@/core/db';
import { isRequired } from '@/core/helpers/validators';
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

		const storeParams = new DBStoreRecord('find_contragents_params', {
			fields: {
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
				resource: {
					description: "Ресурс",
					type: 'JSON',
					config: {
						hide: true
					}
				}
			}
		}

		const store = new DBStore('find_employees', config);
		store.model.offLine = true;

		const onSelect = async (data) => {
			if (data) {
				if (select) {
					panel.close(data);
				} else {
					await newRec('employees', data.resource);
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

							const params = [];

							if (await form.value.validation()) {
								const { name } = storeParams.data;

								if (name) params.push(`name=${name}`);

								if (params.length > 0) {
									const data = await client.request(`Practitioner?${params.join('&')}`);

									if (data) {
										if (data.resourceType == 'Bundle') {
											let found = false;

											const { entry = [] } = data;

											for (const resource of entry) {
												if (resource.resource.resourceType == 'Practitioner') {
													found = true;

													const practitioner = await viewResource(resource.resource);

													if (practitioner) {
														store.push({ id: practitioner.data.id, name: practitioner.data.name, resource: resource.resource });
													}
												}
											}

											if (!found) toastError('Не найдена информация по организациям!');
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
									toastError('Необходимо указать параметры для поиска!');
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
