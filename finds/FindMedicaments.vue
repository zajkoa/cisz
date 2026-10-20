<template>
	<FindResource
		:panel="panel" :defaults="defaults" :select="select"
		:formFields="formFields" :gridFields="gridFields"
		:buildQuery="buildQuery" :transformItem="transformItem">
		<template v-slot="scope">
			<div class="form-row">
				<div class="col">
					<DBEdit :form="scope.form" field="type" radio />
				</div>
			</div>
			<div class="form-group row">
				<div class="col">
					<DBEdit :form="scope.form" field="name" raw />
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
			},
			gridFields: {
				name: { description: "Наименование", type: 'STRING' }
			},
			buildQuery: (data) => {
				if (!data.name) return null;

				const params = [];
				if (+data.type === 1) {
					params.push(`_profile=https://fhir.by/StructureDefinition/MedicationBy`);
					params.push(`name=${data.name}`);
				} else if (+data.type === 2) {
					params.push(`_profile=https://fhir.by/StructureDefinition/DrugComponent`);
					params.push(`ingredient=${data.name}`);
				}
				return `Medication?${params.join('&')}`;
			},
			transformItem: async (resource) => {
				if (resource.resourceType === 'Medication') {
					const medication = await parseResource(resource);
					if (medication.complete) {
						return { name: medication.data.data.name, data: medication.data.data, resource };
					} else {
						toastError(medication.message);
					}
				}
				return null;
			}
		}
	}
})
</script>