import { defineAsyncComponent } from 'vue';

export default ({
	forms: {
		edit: {
			panel: {
				width: '70%'
			},
			component: defineAsyncComponent(() => import('./Edit/Index.vue'))
		},
		list: {
			component: defineAsyncComponent(() => import('./List/Index.vue'))
		},
		select: {
			panel: {
				width: '90%'
			}
		}
	}
})