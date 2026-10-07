<template>
	<DBForm :store="storeParams" ref="form">
		<template v-slot="form">
			<div class="form-row">
				<div class="col-4">
					<DBEdit :form="form" field="contragent" selectMode />
				</div>
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
import { isRequired } from '@/core/helpers/validators';
import { toastError } from '@/core/helpers/toastify';

import { clientCISZ } from '../ClientCISZ';
import { parseResource } from '../api';
import { createFromResurce, openReference } from '../index';
import { query } from '@/core/components/DB/api';

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

		const storeParams = new DBStoreRecord('find_location_params', {
			fields: {
				name: {
					description: 'Наименование',
					type: 'STRING',
					validation: {
						// isRequired
					}
				},
				contragent: {
					description: 'Организация',
					type: {
						reference: 'contragents'
					},
					validation: {
						isRequired
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
								store.data.reference = data.reference;
							} else {
								store.data.reference = null;
							}
						}
					}
				},
				reference: {
					description: 'Ссылка',
					type: 'STRING'
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

		const store = new DBStore('find_locations', config);
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

			const { contragent } = defaults;

			if (contragent) {
				const response = await query({ table: 'contragents', method: 'object', data: { id: contragent }, params: { fields: ['id', 'reference'] } });

				if (response.complete && response.data) {
					const { reference } = response.data;

					if (reference) {
						storeParams.data.reference = reference;
					}
				}
			}

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
								const { name, reference } = storeParams.data;

								if (name) params.push(`name=${name}`);
								if (reference) params.push(`organization=${reference}`);

								if (params.length > 0) {
									const data = await client.request(`Location?${params.join('&')}`);

									if (data) {
										if (data.resourceType == 'Bundle') {
											let found = false;

											const { entry = [] } = data;

											for (const resource of entry) {
												if (resource.resource.resourceType == 'Location') {
													found = true;

													const location = await parseResource(resource.resource);

													if (location.complete) {
														store.push({ name: location.data.data.name, data: location.data.data, resource: resource.resource });
													} else {
														toastError(location.message);
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
