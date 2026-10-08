import Swal from "sweetalert2";

import bus from "@/core/bus";
import stateStore from '@/core/store/index';
import DBStoreRecord from "@/core/db_store_record";
import ListStatusController from "@/core/ListStatusController";
import { query } from "@/core/components/DB/api";
import { availableRole } from "@/core/helpers/access";
import { dbSchema, editRecId } from "@/core/db";
import { getStartPeriodConfig, getEndPeriodConfig } from '@/core/helpers/mixins';
import { toastError, toastSuccess, toastWarning } from "@/core/helpers/toastify";

import { clientCISZ } from "@/cisz/ClientCISZ";
import { findPatients } from "@/cisz";
import { ciszInfo, createBundle, getPatientReference, setResult } from "@/cisz/api";

export default class extends ListStatusController {
	private client = clientCISZ();

	constructor(public params: any, public grid: any) {
		super(
			'cisz',
			{
				...params,
				sorting: true,
				autoOpen: false,
				rowSelect: true,
				localStorageKey: 'cisz',
				limits: [50, 100, 250, 500],
				limit: 50,
				actions: {
					view: false,
					edit: true,
					create: true,
					copy: false,
					delete: true
				},
				onRowSelect: (data: any, checked: boolean) => {
					switch (data.status) {
						case 1:
							toastError('Необходимо произвести проверку документа')

							break;

						case 2:
						case 3:
						case 4:
						case 6:
							this.store.selectRow(data, checked);

							break;

						default:
							toastError('Недопустимый статус');

							break;
					}
				},
				styleTr: (data: any) => {
					const result: any = {};

					switch (data.status) {
						case 2:
							result['color'] = '#41c227';

							break;

						case 3:
						case 4:
						case 5:
							result['color'] = '#3737aa';

							break;

						case 6:
						case 7:
							result['color'] = '#ff0000';

							break;

						default:
							break;
					}

					return result;
				},
				contextMenuBody: (data: any) => {

					const result = [];

					if (availableRole('admin')) {
						if (data.id) {
							result.push(
								{
									icon: <i class="icon icon-file"></i>,
									caption: 'Скопировать ID',
									onClick: () => navigator.clipboard.writeText(data.id)
								}
							);
						}
					}

					return result;
				}
			},
			grid
		);

		this.createStatues(false, false);

		this.createFilter();
	}

	createFilter() {
		this.filterModel = {
			description: 'Дополнительный отбор',
			type: 'JSON',
			config: {
				watch: () => this.fetchData(),
				triggers: (controller: any) => {
					const result = [];

					// result.push({
					// 	text: <i class="icon icon-more-horizontal"></i>,
					// 	title: 'Дополнительный отбор',
					// 	onClick: () => this.editFilter()
					// });

					result.push({
						text: <i class="icon icon-x"></i>,
						title: 'Очистить',
						onClick: () => Object.keys(controller.data.filters).forEach((key) => delete controller.data.filters[key])

					});

					return result;
				},
				notion: (data: any) => this.notionFilter(data)
			},
			model: {
				fields: this.modelFilter()
			}
		}

		this.filter = new DBStoreRecord(
			"cisz_filter",
			{
				fields: {
					filters: this.filterModel
				}
			}
		);
	}

	statues() {
		return [
			{
				caption: 'Новые',
				status: 1,
				filter: { field: 'cisz.status', invalue: [1, 2] },
				info: 0
			},
			{
				caption: 'Переданные',
				status: 2,
				filter: { field: 'cisz.status', invalue: [3, 4] },
				info: 0
			},
			{
				caption: 'Принятые',
				status: 8,
				filter: { field: 'cisz.status', invalue: [5] },
				info: 0
			},
			{
				caption: 'Отмененные',
				status: 9,
				filter: { field: 'cisz.status', invalue: [6, 7] },
				classinfo: 'badge bg-warning',
				info: 0
			},
			{
				caption: 'Ошибочные',
				status: 10,
				filter: { field: 'cisz.status', invalue: [8, 9] },
				classinfo: 'badge bg-warning',
				info: 0
			}
		]
	}

	async info() {
		const params: any = {
			statuses: [],
			filters: this.filters(false)
		}

		for (const filter of this.statusItems.value) {
			if ('info' in filter) {
				filter.info = 0;

				if (!('visible' in filter) || filter.visible) {
					params.statuses.push({ status: filter.status, statuses: filter.filter.invalue });
				}
			}
		}

		const data: any = await ciszInfo(params);

		for (const item in data) {
			for (const filter of this.statusItems.value) {
				if (filter.status == item) filter.info = data[item];
			}
		}
	}

	filters(stauses = true) {
		const result: any = [];

		if (stauses && this.statusItems.value.length > 0) {
			result.push(this.statusItems.value[this.status.value].filter);
		}

		const { time_start, time_end, organization, department, employee } = this.filter.data.filters;

		if (time_start) result.push({ where: '"cisz"."created_at" >= :time_start', params: { time_start } });
		if (time_end) result.push({ where: '"cisz"."created_at" <= :time_end', params: { time_end } });

		if (organization) result.push({ field: '"cisz"."organization"', value: organization });
		if (department) result.push({ field: '"cisz"."department"', value: department });
		if (employee) result.push({ where: `"cisz"."id" in (select owner from cisz_employees where employee = :employee)`, params: { employee } });

		return result;
	}

	async defaults() {
		const result: any = {};

		const data = this.filter.data.filters;

		if (data.organization) {
			result.organization = data.organization;
			result._organization = data._organization;

			if (data.department) {
				result.department = data.department;
				result._department = data._department;
			}
		}

		if (data.employee) {
			result.employee = data.employee;
			result._employee = data._employee;
		}

		return result;
	}

	/**
	 * Установка кнопок формы
	 * @param status 
	 */
	async setButtons() {
		const status = this.status.value;

		const grid = this.grid.value;

		const panelFun: any = [{
			edit: this.store.accessRead() ? {} : undefined,
			add: this.store.accessCreate() ? {} : undefined,
			copy: this.store.accessCreate() ? {} : undefined,
			delete: this.store.accessDelete() ? {} : undefined
		}];

		panelFun.push({
			view_doc: {
				caption: 'Открыть документ',
				class: 'btn btn-copy',
				onClick: async () => await this.viewDoc()
			}
		})

		panelFun.push({
			validate: status == 0 ? {
				caption: 'Проверить',
				class: 'btn btn-copy',
				onClick: async () => await this.validate()
			} : undefined,
			import: status == 0 ? {
				caption: 'Отправить',
				class: 'btn btn-copy',
				onClick: async () => await this.import()
			} : undefined,
			status: status == 1 || status == 2 || status == 3 ? {
				caption: 'Проверить статус',
				class: 'btn btn-copy',
				onClick: async () => await this.getStatus()
			} : undefined,
			cancel: status == 2 ? {
				caption: 'Отменить',
				class: 'btn btn-copy',
				onClick: async () => await this.cancel()
			} : undefined
		})

		panelFun.push({
			login: {
				caption: 'Войти в ЦИСЗ',
				class: 'btn btn-copy',
				onClick: async () => await this.login()
			},
			logout: {
				caption: 'Выйти из ЦИСЗ',
				class: 'btn btn-copy',
				onClick: async () => await this.logout()
			}
		})

		grid.controller.createPanelFun(panelFun);
	}

	showMessage(data: any) {
		const { information = [], error = [], warning = [] } = data;

		for (const item of information) {
			toastSuccess(item);
		}

		let i = 0;

		for (const item of error) {
			if (++i > 3) break;

			toastError(item);
		}

		i = 0;

		for (const item of warning) {
			if (++i > 3) break;

			toastWarning(item);
		}
	}

	async login() {
		this.client.login();
	}

	async logout() {
		this.client.logout();
	}

	modelFilter() {
		return {
			time_start: {
				description: "Начало",
				type: "DATE",
				config: getStartPeriodConfig((controller) => controller.data.filters.time_end, false)
			},
			time_end: {
				description: "Окончание",
				type: "DATE",
				config: getEndPeriodConfig((controller) => controller.data.filters.time_start, false)
			},
			organization: {
				description: "Организация",
				type: {
					reference: "contragents"
				},
				config: {
					options: {
						filters: () => [{ where: `"contragents"."type" = 1` }]
					}
				}
			},
			department: {
				description: "Отделение",
				depends: 'filters.organization',
				type: {
					reference: "contragents.departments"
				},
				config: {
					options: {
						filters: () => ([{ where: `"contragents_departments"."not_used" <> true` }])
					}
				}
			},
			employee: {
				description: "Ответственный",
				type: {
					reference: "employees"
				},
				config: {
					typeahead: {
						table: "employees",
						options: {
							fields: ['id', 'name', 'organization', 'job_title'],
							limit: 10
						},
						notion: (data: any) => {
							const { name, _organization, _job_title } = data;

							const notion = [];

							if (data._job_title) notion.push(`<small>${_job_title}</small>`);
							if (data._organization) notion.push(`<small>(${_organization})</small>`);

							return {
								title: name,
								notion: `${name}<div>${notion.join(' ')}</div>`
							}
						}
					},
					options: {
						filters: (data: any) => {
							const result: any = [];

							if (data.filters.organization) result.push({ field: 'organization', value: data.filters.organization });
							if (data.filters.department) result.push({ field: 'department', value: data.filters.department });

							return result;
						}
					}
				}
			}
		}
	}

	async signData(id: string) {
		const patientResource: any = {};

		const patientReference: any = await getPatientReference(id);

		if (patientReference.reference) {
			const data = await this.client.request(patientReference.reference);

			if (data) {
				const { resourceType } = data;

				if (resourceType == 'Patient') {
					Object.assign(patientResource, data);
				}
			}
		} else {
			const { id, name, personal_number, dateofbirth } = patientReference;

			const result: any = await findPatients({ name, personal_number, dateofbirth }, true, true);

			if (typeof result == 'object') {
				if (result == null) {
					return null;
				} else {
					const data = await this.client.request(result.reference);

					if (data) {
						const { resourceType } = data;

						if (resourceType == 'Patient') {
							Object.assign(patientResource, data);
						}
					}

					await query({
						table: 'patients',
						method: 'save',
						data: { id, reference: result.reference }
					});
				}
			}
		}

		const response: any = await createBundle(
			id,
			{
				patientResource,
				patientReference: patientReference.reference,
				organizationId: this.client.organizationId,
				practitionerId: this.client.practitionerId,
				practitionerRole: this.client.practitionerRole
			}
		);

		return null;

		if (response.complete) {
			stateStore.state.load = true;
			const signData = await this.client.sign(response.data);
			stateStore.state.load = false;

			if ('error' in signData) {
				console.error(signData);

				return null;
			} else {
				return signData.cms;
			}
		} else {
			toastError(response.message);
		}
	}

	//Проверено
	async validate() {
		if (this.client.practitionerRole) {
			const data = this.currentData;

			if (data) {
				const { id, status } = data;

				if ([1, 2].includes(status)) {
					const signData = await this.signData(id);

					if (signData) {
						data.data_sign = signData;

						stateStore.state.load = true;
						const result = await this.client.validateBundle(data.data_sign);
						stateStore.state.load = false;

						const { resourceType = null } = result;

						if (resourceType == "OperationOutcome") {
							const response: any = await setResult(id, { result, status: 2 });

							if (response.complete) {
								toastSuccess(response.message);

								data.status = 2;
								data._status = 'Проверен';

								bus.$emit('save-data', { table: 'cisz', data, newrecord: false });
							} else {
								toastError(response.message);

								data.data_sign = null;

								this.showMessage(response.data);

								bus.$emit('save-data', { table: 'cisz', removeRec: true, data: response.data });
							}
						}
					}
				} else {
					toastError('Недопустимый статус');
				}
			}
		} else {
			toastError('Необходимо авторизоваться в ЦИСЗ!');
		}
	}

	async import() {
		if (this.client.practitionerRole) {
			const selected: any = this.getSelected(false);

			if (selected.length > 0) {
				Swal.fire({
					title: `Отправить выделенные документы (${selected.length} шт.)?`,
					showCancelButton: true,
					confirmButtonText: 'Да',
					cancelButtonText: 'Отмена'
				}).then(async ({ value }) => {
					if (value) {
						for (const id of selected) {
							await this.importBundle(this.store.getRowId(id));
						}

						this.store.clearSelected();

						await this.fetchData();

						await this.info();
					}
				})
			} else {
				const data = this.currentData;

				if (data) {
					Swal.fire({
						title: `Отправить документ?`,
						showCancelButton: true,
						confirmButtonText: 'Да',
						cancelButtonText: 'Отмена'
					}).then(async ({ value }) => {
						if (value) {
							await this.importBundle(data);

							await this.fetchData();

							await this.info();
						}
					})
				}
			}
		} else {
			toastError('Необходимо авторизоваться в ЦИСЗ!');
		}
	}

	async fetchData() {
		if (!this.fetching) {
			this.fetching = true;

			await this.grid.value.controller.fetchData();

			await this.info();

			this.fetching = false;
		}
	}

	async viewDoc() {
		const data = this.currentData;

		if (data) {
			const { document, document_ref } = data;

			if (document && document_ref) {
				const [table] = document.split('|');

				await editRecId(table, document_ref);
			}
		}
	}

	async getStatus() {
		const selected: any = this.getSelected(true);

		for (const id of selected) {
			const data = this.store.getRowId(id);

			if ([3, 4, 5, 6, 7].includes(data.status)) {
				stateStore.state.load = true;
				const result = await this.client.statusBundle(data.id_cisz);
				stateStore.state.load = false;

				const { resourceType } = result;

				if (resourceType == 'Parameters') {
					const response: any = await setResult(data.id, { result });

					const { status } = response.data;

					if (response.complete) {
						if (status == 8) {
							toastError(response.message);

							this.showMessage(response.data);
						} else {
							toastSuccess(response.message);
						}
					} else {
						toastError(response.message);
					}

					const { invalue } = this.statusItems.value[this.status.value].filter;

					if (invalue.includes(status)) {
						const _enum = dbSchema.enums['cisz-status']?.find((el: any) => el.id == status);

						if (_enum) bus.$emit('save-data', { table: 'cisz', newrecord: false, data: { id: data.id, status, _status: _enum.name } });
					} else {
						bus.$emit('save-data', { table: 'cisz', removeRec: true, data: { id: data.id, status } });
					}
				} else if (resourceType == 'OperationOutcome') {
					const { issue } = result;

					for (const item of issue) {
						const { code, diagnostics, severity } = item;

						if (code == 'login' && diagnostics == 'Authentication failed.' && severity == 'error') {
							toastError(diagnostics);

							this.client.login();
						}
					}
				}
			} else {
				toastError('Недопустимый статус');
			}
		}

		await this.info();
	}

	async importBundle(data: any) {
		const { id, status } = data;

		if ([1, 2].includes(status)) {
			if (data.data_sign) {

			} else {
				const signData = await this.signData(id);

				if (signData) {
					data.data_sign = signData;
				} else {
					return;
				}
			}

			stateStore.state.load = true;
			const result = await this.client.importBundle(data.data_sign);
			stateStore.state.load = false;

			const response: any = await setResult(id, { result, status: 3 });

			if (response.complete) {
				bus.$emit('save-data', { table: 'cisz', removeRec: true, data: response.data });

				toastSuccess(response.message);
			} else {
				toastError(response.message);

				this.showMessage(response.data);

				bus.$emit('save-data', { table: 'cisz', removeRec: true, data: response.data });
			}
		} else {
			toastError('Недопустимый статус');
		}
	}

	async cancel() {
		const data = this.currentData;

		if (data) {
			const { id, status } = data;

			if ([4, 5].includes(status)) {
				Swal.fire({
					title: `Отменить документ?`,
					showCancelButton: true,
					confirmButtonText: 'Да',
					cancelButtonText: 'Отмена'
				}).then(async ({ value }) => {
					if (value) {
						stateStore.state.load = true;
						const result = await this.client.cancelBundle(data.id_cisz);
						stateStore.state.load = false;

						const response: any = await setResult(id, { result, status: 6 });

						if (response.complete) {
							bus.$emit('save-data', { table: 'cisz', data: response.data, newrecord: false });

							data.status = 6;
							data._status = 'Запрос на отмену';

							await this.fetchData();

							toastSuccess(response.message);
						} else {
							data.data_sign = null;

							toastError(response.message);
						}
					}
				})
			} else {
				toastError('Недопустимый статус');
			}
		}
	}
}