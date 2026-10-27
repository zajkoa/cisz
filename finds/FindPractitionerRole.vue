<template>
	<FindResource
		ref="findRef"
		:panel="panel" :defaults="defaults" :select="select"
		:formFields="formFields" :gridFields="gridFields"
		:buildQuery="buildQuery" :transformItem="transformItem">
		<template v-slot="scope">
			<div class="form-row">
				<div class="col">
					<DBEdit :form="scope.form" field="fizlico" selectMode />
				</div>
			</div>
		</template>
	</FindResource>
</template>

<script>
import { defineComponent, onMounted, ref } from 'vue';
import { query } from '@/core/components/DB/api';
import { toastError } from '@/core/helpers/toastify';
import { parseResource } from '@/cisz/api';
import FindResource from './FindResource.vue';

export default defineComponent({
	components: { FindResource },
	props: ['panel', 'defaults', 'select'],

	setup(props) {
		const findRef = ref(null);

		const loadPractitionerRef = async (fizlicoId) => {
			if (!fizlicoId) return null;
			const res = await query({
				table: 'fizlica',
				method: 'object',
				data: { id: fizlicoId },
				params: { fields: ['id', 'reference'] }
			});
			if (res.complete && res.data?.reference) {
				return res.data.reference;
			}
			return null;
		};

		const handleFizlicoSelect = async (data, store) => {
			if (!data) {
				store.data.fizlico = null;
				store.data.practitioner = null;
			} else if (data?.reference) {
				store.data.fizlico = data.id;
				store.data.practitioner = data.reference;
			} else if (data?.id) {
				store.data.fizlico = data.id;
				store.data.practitioner = await loadPractitionerRef(data.id);
			} else {
				store.data.fizlico = null;
				store.data.practitioner = null;
			}
		};

		onMounted(async () => {
			if (props.defaults?.fizlico && findRef.value) {
				const store = findRef.value.storeParams;
				if (!store.data.practitioner) {
					store.data.practitioner = await loadPractitionerRef(props.defaults.fizlico);
				}
			}
		});

		return {
			findRef,
			formFields: {
				fizlico: {
					description: 'Физическое лицо',
					type: {
						reference: 'fizlica'
					},
					config: {
						typeahead: {
							options: {
								fields: ['id', 'name', 'reference'],
								limit: 10
							}
						},
						onSelect: async (data, store) => {
							await handleFizlicoSelect(data, store);
						}
					}
				},
				practitioner: {
					type: 'STRING'
				}
			},
			gridFields: {
				name: {
					description: "Сотрудник",
					type: 'STRING'
				},
				organizationName: {
					description: "Организация",
					type: 'STRING'
				},
				locationName: {
					description: "Подразделение",
					type: 'STRING'
				},
				positionName: {
					description: "Должность",
					type: 'STRING'
				}
			},
			buildQuery: async (data) => {
				let refVal = data.practitioner;

				if (!refVal && data.fizlico) {
					refVal = await loadPractitionerRef(data.fizlico);
					data.practitioner = refVal;
				}

				if (!refVal) {
					toastError('У выбранного физлица не указана ссылка на ЦИСЗ!');
					return null;
				}

				const id = refVal.replace('Practitioner/', '');
				return `PractitionerRole?practitioner=${id}`;
			},
			transformItem: async (resource) => {
				if (resource.resourceType !== 'PractitionerRole') return null;

				const response = await parseResource(resource);
				if (response.complete) {
					const parsedData = response.data.data;
					const posExt = resource.extension?.find((e) => e.url?.includes('PractitionerPosition'));
					const ncrbDisplay = posExt?.extension?.find((x) => x.url?.includes('PractitionerPositionCodeNCRB'))?.valueCodeableConcept?.coding?.[0]?.display;
					const typeDisplay = posExt?.extension?.find((x) => x.url?.includes('PractitionerPositionType'))?.valueCodeableConcept?.coding?.[0]?.display;

					return {
						name: resource.practitioner?.display || parsedData.name || 'Сотрудник',
						organizationName: resource.organization?.display || '',
						locationName: resource.location?.[0]?.display || '',
						positionName: ncrbDisplay || typeDisplay || '',
						data: parsedData,
						resource
					};
				} else {
					toastError(response.message);
				}
				return null;
			}
		};
	}
});
</script>