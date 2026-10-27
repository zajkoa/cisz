<template>
	<DBForm :store="storeParams" ref="formRef">
		<template v-slot="dbFormContext">
			<slot :form="dbFormContext" :storeParams="storeParams"></slot>
		</template>
	</DBForm>

	<DBGrid :store="store" :config="gridConfig" @select="data => onSelect(data)" ref="gridRef"></DBGrid>
</template>


<script>
import { defineComponent, onMounted, ref } from 'vue';

import DBStore from '@/core/db_store';
import DBStoreRecord from '@/core/db_store_record';
import { toastError } from '@/core/helpers/toastify';

import { clientCISZ } from '@/cisz/ClientCISZ';
import { createFromResurce, openReference } from '@/cisz/index';

export default defineComponent({
	name: 'FindResource',

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
			type: Boolean,
			default: false
		},
		formFields: {
			type: Object,
			required: true
		},
		gridFields: {
			type: Object,
			required: true
		},
		buildQuery: {
			type: Function,
			required: true
		},
		transformItem: {
			type: Function,
			required: true
		},
		onSaveRecord: {
			type: Function,
			default: null
		}
	},

	setup(props) {
		const client = clientCISZ();
		const formRef = ref(null);
		const gridRef = ref(null);

		const storeParams = new DBStoreRecord('find_resource_params', {
			fields: props.formFields
		});

		const gridConfig = {
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
				...props.gridFields,
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
				name: async (data) => {
					if (data.resource) {
						const { resourceType, id } = data.resource;
						await openReference(`${resourceType}/${id}`);
					}
				},
				patient: async (data) => {
					if (data.resource) {
						const { resourceType, id } = data.resource;
						await openReference(`${resourceType}/${id}`);
					}
				}
			}
		};

		const store = new DBStore('find_resource_store', gridConfig);
		store.model.offLine = true;

		const onSelect = async (data) => {
			if (data) {
				if (props.select) {
					props.panel.close(data.data || data);
				} else {
					if (props.onSaveRecord) {
						await props.onSaveRecord(data);
					} else {
						await createFromResurce(data.resource);
					}
				}
			}
		};

		const onSearch = async () => {
			store.clear();

			if (await formRef.value.validation()) {
				const queryUrl = await props.buildQuery(storeParams.data);
				if (!queryUrl) return;

				const response = await client.request(queryUrl);

				if (response?.resourceType === 'Bundle') {
					let found = false;
					for (const item of response.entry || []) {
						if (item.resource) {
							found = true;
							const rowData = await props.transformItem(item.resource);
							if (rowData) store.push(rowData);
						}
					}
					if (!found) toastError('По вашему запросу ничего не найдено!');
				} else if (response?.resourceType === 'OperationOutcome') {
					for (const issue of response.issue || []) {
						if (issue.severity === 'error') toastError(issue.diagnostics);
					}
				}
			}
		};

		onMounted(async () => {
			await storeParams.defaultsData(props.defaults);

			gridRef.value.controller.createPanelFun([
				{
					secondary: {
						caption: 'Поиск',
						title: 'Поиск',
						class: 'btn btn-add',
						onClick: onSearch
					}
				}
			]);
		});

		return { formRef, gridRef, storeParams, store, gridConfig, onSelect };
	}
});
</script>