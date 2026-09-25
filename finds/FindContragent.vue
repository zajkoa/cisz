<template>
	<DBForm :store="storeParams" ref="form">
		<template v-slot="form">
			<div class="form-row">
				<div class="col">
					<DBEdit :form="form" field="name" />
				</div>
			</div>
			<div class="form-group row">
				<div class="col-auto">
					<DBEdit :form="form" field="location" />
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
				},
				location: {
					description: 'Поиск структурного подразделения',
					type: 'BOOLEAN'
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

		const store = new DBStore('find_contragents', config);
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

							const params = [];

							if (await form.value.validation()) {
								const { name, location } = storeParams.data;

								if (name) params.push(`name=${name}`);

								if (params.length > 0) {
									const data = await client.request(`${location ? 'Location' : 'Organization'}?${params.join('&')}`);

									if (data) {
										if (data.resourceType == 'Bundle') {
											let found = false;

											const { entry = [] } = data;

											for (const resource of entry) {
												if (resource.resource.resourceType == 'Organization') {
													found = true;

													const organization = await parseResource(resource.resource);

													if (organization.complete) {
														store.push({ name: organization.data.data.name, data: organization.data.data, resource: resource.resource });
													} else {
														toastError(organization.message);
													}
												}

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
