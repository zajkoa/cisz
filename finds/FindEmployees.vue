<template>
	<FindResource
		:panel="panel" :defaults="defaults" :select="select"
		:formFields="formFields" :gridFields="gridFields"
		:buildQuery="buildQuery" :transformItem="transformItem"
		:onSaveRecord="onSaveRecord">
		<template v-slot="scope">
			<div class="form-row">
				<div class="col">
					<DBEdit :form="scope.form" field="name" />
				</div>
			</div>
		</template>
	</FindResource>
</template>

<script>
import { defineComponent } from 'vue';

import { isRequired } from '@/core/helpers/validators';
import { toastError } from '@/core/helpers/toastify';

import { viewResource } from '@/cisz/api';

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
				}
			},
			gridFields: {
				name: {
					description: "Наименование",
					type: 'STRING'
				}
			},
			buildQuery: (data) => {
				if (!data.name) {
					toastError('Необходимо указать параметры для поиска!');
					return null;
				}
				return `Practitioner?name=${data.name}`;
			},
			transformItem: async (resource) => {
				if (resource.resourceType === 'Practitioner') {
					const practitioner = await viewResource(resource);
					if (practitioner) {
						return { id: practitioner.data.id, name: practitioner.data.name, resource };
					}
				}
				return null;
			}
		};
	}
})
</script>
