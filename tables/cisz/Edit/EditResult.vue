<template>
	<ViewCISZ :resource="data.json_data"></ViewCISZ>
</template>

<script>
import { defineComponent } from 'vue';

import ViewCISZ from '@/cisz/components/ViewCISZ/index.vue';

export default defineComponent({
	components: {
		ViewCISZ
	},

	props: {
		data: {
			type: Object,
			default: () => ({})
		}
	}
})
</script>
