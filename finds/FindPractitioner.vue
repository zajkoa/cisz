<template>
	<FindResource
		:panel="panel" :defaults="defaults" :select="select"
		:formFields="formFields" :gridFields="gridFields"
		:buildQuery="buildQuery" :transformItem="transformItem">
		<template v-slot="scope">
			<div class="form-row">
				<div class="col-7">
					<DBEdit :form="scope.form" field="name" clear />
				</div>
				<div class="col-5">
					<DBEdit :form="scope.form" field="identifier" clear />
				</div>
			</div>
		</template>
	</FindResource>
</template>

<script>
import { defineComponent } from 'vue';
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
					description: 'ФИО медработника',
					type: 'STRING'
				},
				identifier: {
					description: 'Идентификационный номер',
					type: 'STRING'
				}
			},
			gridFields: {
				name: {
					description: "ФИО медработника",
					type: 'STRING'
				},
				dateofbirth: {
					description: "Дата рождения",
					type: 'DATEONLY'
				},
				personal_number: {
					description: "Идентификационный номер",
					type: 'STRING'
				}
			},
			buildQuery: (data) => {
				const params = [];
				if (data.identifier) {
					params.push(`identifier=${data.identifier.trim()}`);
				}
				if (data.name) {
					params.push(`name=${encodeURIComponent(data.name.trim())}`);
				}

				if (params.length === 0) {
					toastError('Необходимо указать ФИО или идентификационный номер для поиска!');
					return null;
				}

				return `Practitioner?${params.join('&')}`;
			},
			transformItem: async (resource) => {
				if (resource.resourceType !== 'Practitioner') return null;

				const response = await parseResource(resource);
				if (response.complete) {
					const parsedData = response.data.data;
					return {
						name: parsedData.name,
						dateofbirth: parsedData.dateofbirth,
						personal_number: parsedData.personal_number,
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