<template>
	<DBForm :store="storeParams" ref="form">
		<template v-slot="form">
			<div class="form-row">
				<div class="col">
					<DBEdit :form="form" field="name" clear />
				</div>
				<div class="col-3">
					<DBEdit :form="form" field="count" />
				</div>
			</div>
		</template>
	</DBForm>

	<div class="d-flex justify-content-between align-items-center mb-1" v-if="total > 0">
		<div class="text-muted small">
			Найдено: {{ total }} (показаны {{ currentRange }})
		</div>

		<div class="btn-group btn-group-sm">
			<button type="button" class="btn btn-light border" :disabled="offset <= 0 || loading" @click="onPrevPage" title="Предыдущая страница">
				<i class="icon icon-chevron-left"></i> Назад
			</button>

			<span class="px-2 d-flex align-items-center">
				Страница {{ currentPage }} из {{ totalPages }}
			</span>

			<button type="button" class="btn btn-light border" :disabled="offset + currentCount >= total || loading" @click="onNextPage" title="Следующая страница">
				Вперед <i class="icon icon-chevron-right"></i>
			</button>
		</div>
	</div>

	<DBGrid :store="store" :config="config" @select="data => onSelect(data)" ref="grid"></DBGrid>
</template>

<script>
import { computed, defineComponent, onMounted, ref, watch } from 'vue';

import DBStore from '@/core/db_store';
import DBStoreRecord from '@/core/db_store_record';
import { isRequired } from '@/core/helpers/validators';
import { toastError } from '@/core/helpers/toastify';

import { clientCISZ } from '@/cisz/ClientCISZ';

export default defineComponent({
	inheritAttrs: false,

	props: {
		panel: {
			type: Object,
			default: () => ({})
		},
		defaults: {
			type: Object,
			default: () => ({})
		},
		select: {
			type: Boolean,
			default: true
		},
		system: {
			type: String,
			default: ''
		},
		searchLabel: {
			type: String,
			default: 'Наименование'
		},
		fields: {
			type: Object,
			default: () => undefined
		},
		transformItem: {
			type: Function,
			default: undefined
		}

	},

	setup(props) {
		const { panel, defaults } = props;
		const client = clientCISZ();

		const grid = ref(null);
		const form = ref(null);
		const loading = ref(false);

		const total = ref(0);
		const offset = ref(0);

		const storeParams = new DBStoreRecord(
			'find_valueset_params',
			{
				fields: {
					name: {
						description: props.searchLabel,
						type: 'STRING',
						validation: {
							isRequired
						}
					},
					count: {
						description: 'Кол-во',
						type: {
							enum: [
								{
									id: 10,
									name: '10'
								},
								{
									id: 25,
									name: '25'
								},
								{
									id: 50,
									name: '50'
								},
								{
									id: 100,
									name: '100'
								}
							]
						}
					}
				}
			}
		);

		const currentCount = computed(() => Number(storeParams.data.count) || 25);
		const currentPage = computed(() => Math.floor(offset.value / currentCount.value) + 1);
		const totalPages = computed(() => Math.ceil(total.value / currentCount.value) || 1);

		const currentRange = computed(() => {
			if (total.value === 0) return '0';
			const from = offset.value + 1;
			const to = Math.min(offset.value + currentCount.value, total.value);
			return `${from}–${to}`;
		});

		const defaultFields = {
			code: {
				description: 'Код',
				type: 'STRING'
			},
			display: {
				description: 'Наименование',
				type: 'STRING'
			}
		};

		const config = {
			key: 'code',
			menu: false,
			view: false,
			searchpanel: false,
			height: '350px',
			selectMode: true,
			fields: props.fields || defaultFields
		};

		const store = new DBStore('find_valueset_store', config);
		store.model.offLine = true;

		const onSelect = (data) => {
			if (data) {
				panel.close(data);
			}
		};

		const searchData = async (newOffset = 0) => {
			if (await form.value.validation()) {
				loading.value = true;
				store.clear();

				offset.value = newOffset;
				const { name } = storeParams.data;

				try {
					const filterParam = encodeURIComponent(name.trim());
					const countParam = currentCount.value;
					const offsetParam = offset.value;

					let queryTarget = '';

					if (props.system) {
						queryTarget = `system=${encodeURIComponent(props.system)}`;
					} else {
						toastError('Не указан справочник (system / url) для поиска');

						return;
					}

					const res = await client.request(`ValueSet/$expand?${queryTarget}&filter=${filterParam}&count=${countParam}&offset=${offsetParam}`);

					if (res?.resourceType === 'ValueSet' && res.expansion) {
						total.value = res.expansion.total ?? (res.expansion.contains?.length || 0);
						const items = res.expansion.contains || [];

						if (items.length === 0) {
							toastError('Записи не найдены');

							return;
						}

						for (const item of items) {
							if (props.transformItem) {
								store.push(props.transformItem(item));
							} else {
								store.push({
									code: item.code,
									display: item.display,
									system: item.system
								});
							}
						}
					} else if (res?.resourceType === 'OperationOutcome') {
						const msg = res.issue?.[0]?.diagnostics || 'Ошибка при поиске в ЦИСЗ';
						toastError(msg);
					} else {
						toastError('Не удалось получить данные из ЦИСЗ');
					}
				} catch (err) {
					console.error(err);
					toastError(err.message || 'Ошибка запроса к ЦИСЗ');
				} finally {
					loading.value = false;
				}
			}
		};

		const onNextPage = async () => {
			const nextOffset = offset.value + currentCount.value;
			if (nextOffset < total.value) {
				await searchData(nextOffset);
			}
		};

		const onPrevPage = async () => {
			const prevOffset = Math.max(0, offset.value - currentCount.value);
			await searchData(prevOffset);
		};

		watch(
			() => storeParams.data.count,
			() => {
				if (total.value > 0) {
					searchData(0);
				}
			}
		);

		onMounted(async () => {
			await storeParams.defaultsData({
				count: 25,
				...defaults
			});

			grid.value.controller.createPanelFun([
				{
					find: {
						caption: 'Поиск',
						title: 'Поиск',
						class: 'btn btn-add',
						onClick: async () => await searchData(0)
					}
				}
			]);
		});

		return {
			onSelect,
			form,
			grid,
			store,
			config,
			storeParams,
			loading,
			total,
			offset,
			currentCount,
			currentPage,
			totalPages,
			currentRange,
			onNextPage,
			onPrevPage
		};
	}
});
</script>