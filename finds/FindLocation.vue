<template>
	<FindResource
		ref="findRef"
		:panel="panel" :defaults="defaults" :select="select"
		:formFields="formFields" :gridFields="gridFields"
		:buildQuery="buildQuery" :transformItem="transformItem">
		<template v-slot="scope">
			<div class="form-row">
				<div class="col-4">
					<DBEdit :form="scope.form" field="contragent" selectMode
						@select="data => scope.storeParams.data.reference = data ? data.reference : null" />
				</div>
				<div class="col">
					<DBEdit :form="scope.form" field="name" />
				</div>
			</div>
		</template>
	</FindResource>
</template>

<script>
import { defineComponent, onMounted, ref } from 'vue';

import { query } from '@/core/components/DB/api';
import { toastError } from '@/core/helpers/toastify';
import { isRequired } from "@/core/helpers/validators";

import { parseResource } from '@/cisz/api';

import FindResource from './FindResource.vue';

export default defineComponent({
	components: { FindResource },

	props: ['panel', 'defaults', 'select'],

	setup(props) {
		const findRef = ref(null);

		onMounted(async () => {
			if (props.defaults?.contragent && findRef.value) {
				const response = await query({ table: 'contragents', method: 'object', data: { id: props.defaults.contragent }, params: { fields: ['id', 'reference'] } });

				if (response.complete && response.data?.reference) {
					findRef.value.storeParams.data.reference = response.data.reference;
				}
			}
		});

		return {
			findRef,
			formFields: {
				name: {
					description: 'Наименование',
					type: 'STRING',
					validation: {}
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
						onSelect: async (data, store) => {
							if (data) {
								store.data.contragent = data.id;
								store.data.reference = data.reference || null;
							} else {
								store.data.contragent = null;
								store.data.reference = null;
							}
						}
					}
				},
				reference: {
					description: 'Ссылка',
					type: 'STRING'
				}
			},
			gridFields: {
				name: {
					description: "Наименование",
					type: 'STRING'
				}
			},
			buildQuery: (data) => {
				const params = [];

				if (data.name) params.push(`name=${data.name}`);

				if (data.reference) params.push(`organization=${data.reference}`);

				if (params.length === 0) {
					toastError('Необходимо указать параметры для поиска!');
					return null;
				}

				return `Location?${params.join('&')}`;
			},
			transformItem: async (resource) => {
				if (resource.resourceType === 'Location') {
					const location = await parseResource(resource);
					if (location.complete) {
						return { name: location.data.data.name, data: location.data.data, resource };
					} else {
						toastError(location.message);
					}
				}

				return null;
			}
		}
	}
})
</script>
