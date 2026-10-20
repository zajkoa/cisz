<template>
	<FindResource
		:panel="panel" :defaults="defaults" :select="select"
		:formFields="formFields" :gridFields="gridFields"
		:buildQuery="buildQuery" :transformItem="transformItem">
		<template v-slot="scope">
			<div class="form-row">
				<div class="col">
					<DBEdit :form="scope.form" field="name" />
				</div>
				<div class="col-2">
					<DBEdit :form="scope.form" field="count" />
				</div>
			</div>
			<div class="form-group row">
				<div class="col-auto">
					<DBEdit :form="scope.form" field="location" />
				</div>
			</div>
		</template>
	</FindResource>
</template>

<script>
import { defineComponent } from 'vue';
import { isRequired } from '@/core/helpers/validators';
import { toastError } from '@/core/helpers/toastify';

import { parseResource } from '@/cisz/api';

import FindResource from './FindResource.vue';

export default defineComponent({
	components: { FindResource },
	props: ['panel', 'defaults', 'select'],

	setup() {
		return {
			formFields: {
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
			},
			gridFields: {
				name: {
					description: "Наименование",
					type: 'STRING'
				}
			},
			buildQuery: (data) => {
				const params = [];
				if (data.count) params.push(`_count=${data.count}`);
				if (data.name) params.push(`name=${data.name}`);

				if (params.length === 0) {
					toastError('Необходимо указать параметры для поиска!');
					return null;
				}
				return `${data.location ? 'Location' : 'Organization'}?${params.join('&')}`;
			},
			transformItem: async (resource) => {
				if (resource.resourceType === 'Organization' || resource.resourceType === 'Location') {
					const parsed = await parseResource(resource);
					if (parsed.complete) {
						return { name: parsed.data.data.name, data: parsed.data.data, resource };
					} else {
						toastError(parsed.message);
					}
				}
				return null;
			}
		}
	}
})
</script>
