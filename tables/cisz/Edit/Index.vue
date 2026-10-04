<template>
	<DBForm :store="store" :config="config" :data="data" ref="form">
		<template v-slot="form">
			<Card :panelFun="controller.panelFun.value" :panel="panel.key">
				<div class="form-row">
					<div class="col-4">
						<DBEdit :form="form" field="organization" selectMode :readonly="!availableRole('admin')" />
					</div>
					<div class="col-4">
						<DBEdit :form="form" field="department" selectMode />
					</div>
				</div>

				<div class="form-row">
					<div class="col-2">
						<DBEdit :form="form" field="status" />
					</div>
					<div class="col-4">
						<DBEdit :form="form" field="_document" readonly />
					</div>
					<div class="col-2">
						<DBEdit :form="form" field="created_at" readonly />
					</div>
					<div class="col-4">
						<DBEdit :form="form" field="id_cisz" readonly />
					</div>
				</div>

				<Tabs>
					<Tab caption="Результат ответа">
						<ViewCISZ :resource="resource"></ViewCISZ>
					</Tab>

					<Tab caption="Ответы">
						<DBGrid :form="form" field="results" :config="results" :readonly="!availableRole('admin')"></DBGrid>
					</Tab>

					<Tab caption="Данные">
						<div ref="jsonEditorRef" style="width: 100%; height: calc(100lvh - 472px);"></div>
					</Tab>

					<Tab caption="История статусов" :visible="!isNew">
						<DBGrid :form="form" field="history" readonly></DBGrid>
					</Tab>

					<Tab caption="Ответственные">
						<DBGrid :form="form" field="employees" :config="employees" :readonly="!availableRole('admin')"></DBGrid>
					</Tab>

					<Tab caption="Дополнительно" :visible="availableRole('admin')">
						<div class="form-row">
							<div class="col-3">
								<DBEdit :form="form" field="document" />
							</div>
							<div class="col-3">
								<DBEdit :form="form" field="document_ref" />
							</div>
							<div class="col-3">
								<DBEdit :form="form" field="document_notion" />
							</div>
							<div class="col-3">
								<DBEdit :form="form" field="_document" readonly />
							</div>
						</div>
					</Tab>
				</Tabs>
			</Card>
		</template>
	</DBForm>
</template>

<script>
import { defineComponent, ref, defineAsyncComponent, onUnmounted, computed } from 'vue';

import ViewCISZ from '@/cisz/components/ViewCISZ/index.vue';

import { availableRole } from "@/core/helpers/access";

import EditController from './controller';

export default defineComponent({
	components: {
		ViewCISZ
	},

	props: {
		panel: {
			type: Object,
			default: () => ({})
		},
		store: {
			type: Object,
			default: () => ({})
		},
		config: {
			type: Object,
			default: () => ({})
		},
		data: {
			type: Object,
			default: () => ({})
		}
	},

	setup(props) {
		const form = ref(null);

		const controller = new EditController(form, props);

		const results = {
			edit: {
				panel: {
					width: '90%'
				},
				component: defineAsyncComponent(() => import('./EditResult.vue'))
			}
		}

		const employees = {
			edit: {
				panel: {
					modal: true
				}
			}
		}

		onUnmounted(() => {
			if (controller.editor) {
				controller.editor.destroy();
				controller.editor = null;
			}
		})

		return Object.assign(
			controller.setup(),
			{
				results,
				employees,
				availableRole,
				isNew: computed(() => controller.isNew),
				jsonEditorRef: controller.jsonEditorRef,
				resource: controller.resource
			},
		);
	}
})
</script>
