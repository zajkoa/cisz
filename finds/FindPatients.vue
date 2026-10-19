<template>
	<FindResource
		:panel="panel" :defaults="defaults" :select="select"
		:formFields="formFields" :gridFields="gridFields"
		:buildQuery="buildQuery" :transformItem="transformItem"
	>
		<template v-slot="scope">
			<div class="form-row">
				<div class="col-5">
					<DBEdit :form="scope.form" field="name" clear />
				</div>
				<div class="col-3">
					<DBEdit :form="scope.form" field="dateofbirth" clear />
				</div>
				<div class="col-4">
					<DBEdit :form="scope.form" field="personal_number" clear />
				</div>
			</div>
		</template>
	</FindResource>
</template>

<script>
import { defineComponent, onMounted, onUnmounted } from 'vue';
import bus from '@/core/bus';
import { toastError } from '@/core/helpers/toastify';
import { parseResource } from '../api';
import { clientCISZ } from '../ClientCISZ';
import FindResource from './FindResource.vue';

export default defineComponent({
	components: { FindResource },
	props: ['panel', 'defaults', 'select'],

	setup(props) {
		const client = clientCISZ();

		const onSaveData = async (saveData) => {
			if (saveData.table === "patients" && saveData.newrecord) {
				props.panel.close(saveData.data);
			}
		};

		onMounted(() => bus.$on('save-data', onSaveData));
		onUnmounted(() => bus.$off('save-data', onSaveData));

		return {
			formFields: {
				name: {
					description: 'ФИО',
					type: 'STRING'
				},
				personal_number: {
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
			buildQuery: (data) => {
				const params = [];
				let identifiers = 0;

				if (data.personal_number) {
					identifiers += 2;
					params.push(`identifier=${data.personal_number.trim()}`);
				}
				if (data.name) {
					identifiers += 1;
					params.push(`name=${data.name.trim()}`);
				}
				if (data.dateofbirth) {
					identifiers += 1;
					params.push(`birthdate=${data.dateofbirth}`);
				}

				if (identifiers <= 1) {
					toastError('Необходимо ввести более одного параметра для поиска!');
					return null;
				}

				return `Patient?${params.join('&')}`;
			},
			transformItem: async (resource) => {
				if (resource.resourceType !== 'Patient') return null;

				const profiles = [
					'https://fhir.by/StructureDefinition/RelatedPersonPermanentBy',
					'https://fhir.by/StructureDefinition/RelatedPersonTemporaryBy'
				];

				const relatedPersons = [];
				for (const prof of profiles) {
					try {
						const rpBundle = await client.request(`Patient/${resource.id}/RelatedPerson?patient=${resource.id}&_profile=${prof}`);
						if (rpBundle?.resourceType === 'Bundle') {
							for (const rpEntry of rpBundle.entry || []) {
								if (rpEntry.resource?.resourceType === 'RelatedPerson') {
									relatedPersons.push(rpEntry.resource);
								}
							}
						}
					} catch (e) {}
				}

				if (relatedPersons.length > 0) {
					resource._relatedPersons = relatedPersons;
				}

				const response = await parseResource(resource);
				if (response.complete) {
					const parsedData = response.data.data;
					return { data: parsedData, patient: parsedData.name, dateofbirth: parsedData.dateofbirth, resource };
				} else {
					toastError(response.message);
				}
				return null;
			}
		}
	}
})
</script>