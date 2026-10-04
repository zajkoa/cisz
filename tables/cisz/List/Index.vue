<template>
	<NavBar :items="statusItems" @change="onChangeStatus"></NavBar>

	<DBForm :store="filter">
		<template v-slot="form">
			<div class="form-group row">
				<div class="col-xl-2 col-lg-3 col-md-6 col-sm-12">
					<DBEdit :form="form" field="filters.time_start" clear />
				</div>
				<div class="col-xl-2 col-lg-3 col-md-6 col-sm-12">
					<DBEdit :form="form" field="filters.time_end" clear />
				</div>
				<div class="col-xl-2 col-lg-4 col-sm-6" v-if="availableRole(['admin', 'all-departments'])">
					<DBEdit :form="form" field="filters.organization" :selectMode="true" placeholder="Все" completed />
				</div>
				<div class="col-xl-2 col-lg-4 col-sm-6" v-if="availableRole(['admin', 'all-departments'])">
					<DBEdit :form="form" field="filters.department" :selectMode="true" placeholder="Все" completed />
				</div>
				<div class="col-xl-4 col-lg-4 col-sm-6">
					<DBEdit :form="form" field="filters.employee" :selectMode="true" placeholder="Все" completed />
				</div>
			</div>
		</template>
	</DBForm>

	<DBGrid :store="store" :config="config" ref="grid"></DBGrid>
</template>

<script>
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import bus from '@/core/bus';
import stateStore from '@/core/store/index';
import { editRecId } from '@/core/db';
import { setCaption } from '@/core/layouts';
import { toastError } from '@/core/helpers/toastify';
import { availableRole } from "@/core/helpers/access";
import { openReference } from '@/cisz';

import ListController from './controller';
import { fio } from '@/core/helpers/utils';

export default defineComponent({
	setup() {
		const grid = ref(null);
		const route = useRoute();

		const controller = new ListController(
			{
				sorting: true,
				fields: {
					id: {
						config: {
							hide: true
						}
					},
					status: {
						description: 'Статус',
						config: {
							sorting: 'cisz.status'
						}
					},
					document: {
						description: "Документ",
						config: {
							hide: true
						}
					},
					document_ref: {
						description: "Документ",
						config: {
							hide: true
						}
					},
					document_notion: {
						description: "Документ",
						config: {
							sorting: 'cisz.document_notion'
						}
					},
					data_base64: {
						description: 'Данные в BASE64',
						type: 'TEXT',
						config: {
							hide: true
						}
					},
					data_sign: {
						description: 'Подписанные данные',
						type: 'TEXT',
						config: {
							hide: true
						}
					},
					organization: {
						description: "Организация",
						config: {
							visible: true
						}
					},
					department: {
						description: "Отделение",
						config: {
							visible: false
						}
					},
					employees: {
						description: "Ответственные",
						config: {
							hide: true
						}
					},
					responsible: {
						description: "Ответственные",
						config: {
							calc: (data) => data.employees.map((el) => fio(el._employee)).join(', ')
						}
					},
					created_at: {
						description: "Время создания",
						config: {
							sorting: 'cisz.created_at'
						}
					},
					id_cisz: {
						description: "id_cisz"
					}
				},
				cellClick: {
					id_cisz: async (data) => {
						const { id_cisz } = data;

						await openReference(`Bundle/${id_cisz}`);
					},
					document_notion: async (data) => {
						const { document, document_ref } = data;

						if (document && document_ref) {
							const [table] = document.split('|');

							await editRecId(table, document_ref);
						}
					}
				}
			},
			grid
		);

		const refreshData = async (payload) => {
			if (payload.table == "cisz") {
				if (payload.removeRec) {
					const { id } = payload.data;

					controller.store.deleteById(id);

					if (payload.info) {
						await controller.info();
					}
				}
			}
		}

		onMounted(async () => {
			setCaption('Список');

			const query = route.query;
			const urlFilters = {};
			['organization', 'department', 'employee', 'time_start', 'time_end'].forEach(key => {
				if (query[key]) {
					urlFilters[key] = query[key];
				}
			});

			await controller.filter.defaultsData(Object.keys(urlFilters).length > 0 ? { filters: urlFilters } : undefined);

			await controller.fetchData();

			controller.setButtons();

			controller.store.model.onBeforeDelete = (data) => {
				if (availableRole(['admin'])) return true;

				if (data.status == 1) {
					const { employee } = stateStore.state.user;

					if (data.employee == employee) return true;
				}

				toastError('У Вас нет прав на удаление текущей записи!');

				return false;
			}

			controller.store.model.onAfterDelete = async () => {
				await controller.info();
			}

			bus.$on('save-data', refreshData);
		})

		onUnmounted(() => {
			bus.$off('save-data', refreshData);
		})

		return {
			grid,
			availableRole,
			...controller.setup()
		}
	}
})
</script>
