<template>
	<PatientInfo :defaults="defaults"></PatientInfo>
</template>

<script>
import dayjs from 'dayjs';
import { defineComponent, onMounted } from 'vue';

import { setCaption } from '@/core/layouts';
import PatientInfo from "@/cisz/PatientInfo/index.vue";

export default defineComponent({
	components: {
		PatientInfo
	},

	setup() {
		const defaults = {
			begin: dayjs().startOf("month").format('YYYY-MM-DD'),
			end: dayjs().endOf("month").format('YYYY-MM-DD')
		};

		onMounted(() => {
			setCaption('Информация по пациенту');
		})

		return {
			defaults
		}
	}
})
</script>

<style></style>