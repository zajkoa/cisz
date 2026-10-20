<template>
	<FindResource
		:panel="panel" :defaults="defaults" :select="select"
		:formFields="formFields" :gridFields="gridFields"
		:buildQuery="buildQuery" :transformItem="transformItem"
		:onSaveRecord="onSaveRecord">
		<template v-slot="scope">
			<div class="form-row">
				<div class="col-5">
					<DBEdit :form="scope.form" field="name" />
				</div>
				<div class="col-3">
					<DBEdit :form="scope.form" field="dateofbirth" />
				</div>
				<div class="col-4">
					<DBEdit :form="scope.form" field="identifier" />
				</div>
			</div>
		</template>
	</FindResource>
</template>

<script>
import { defineComponent } from 'vue';

import { viewResource } from '@/cisz/api';

import FindResource from './FindResource.vue';

export default defineComponent({
	components: { FindResource },

	props: ['panel', 'defaults', 'select'],

	setup() {
		return {
			formFields: {
				name: {
					description: 'ФИО',
					type: 'STRING'
				},
				identifier: {
					description: 'Идентификатор',
					type: 'STRING'
				},
				dateofbirth: {
					description: 'Дата рождения',
					type: 'DATEONLY'
				}
			},
			gridFields: {
				patient: {
					description: "Ф.И.О.",
					type: 'STRING'
				},
				dateofbirth: {
					description: 'Дата рождения',
					type: 'DATEONLY'
				}
			},
			buildQuery: () => {
				const patient = 'Patient/pa-5b889ad8-07e6-11f1-a854-156915a18159';
				return `${patient}/RelatedPerson?_profile=https://fhir.by/StructureDefinition/RelatedPersonPermanentBy&patient=${patient}`;
			},
			transformItem: async (resource) => {
				if (resource.resourceType === 'RelatedPerson') {
					const person = await viewResource(resource);
					if (person) {
						return { patient: person.data.name, dateofbirth: person.data.dateofbirth, resource };
					}
				}
				return null;
			},
			onSaveRecord: async (data) => {
				const person = await viewResource(data.resource);
				// await newRec('patients', person.data);
			}
		}
	}
})
</script>