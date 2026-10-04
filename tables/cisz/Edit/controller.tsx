import Swal from "sweetalert2";
import { createJSONEditor } from 'vanilla-jsoneditor';
import { reactive, ref, watchEffect } from "vue";

import bus from "@/core/bus";
import EditController from "@/core/EditController";
import { editRecId } from "@/core/db";
import { toastError } from "@/core/helpers/toastify";
import { clearObject } from "@/core/helpers/utils";
import { onRenderValue } from '@/cisz/json_editor';
import { availableRole } from '@/core/helpers/access';
import { setStatus } from "@/cisz/api";

export default class extends EditController {
	public resource: any = reactive({});
	public jsonEditorRef: any = ref(null);
	public editor: any = null;

	setup() {
		watchEffect(() => {
			if (Object.keys(this.data.value).length > 0) {
				this.setButtons();
			}
		});

		return super.setup();
	}

	settings() {
		return Object.assign(this.props.config, {
			onCreate: (store: any) => {
				this.readonly.value = !availableRole('admin');

				clearObject(this.resource);

				if (this.data.value.results.length > 0) {
					Object.assign(this.resource, this.data.value.results.at(-1).json_data);
				}

				this.editor = createJSONEditor({
					target: this.jsonEditorRef.value,
					props: {
						mode: 'tree',
						readOnly: true,
						content: {
							json: this.data.value.json_data
						},
						onRenderValue
					}
				});
			},

			fields: {
				id: {},
				id_cisz: {
					description: "id_cisz"
				},
				document: {
					description: "Документ"
				},
				document_ref: {
					description: 'Документ'
				},
				document_notion: {
					description: 'Документ'
				},
				_document: {
					description: 'Документ',
					type: 'STRING',
					config: {
						calc: (data: any) => data?.document_notion ? data.document_notion : data.document_ref,
						triggers: (controller: any) => {
							const result: any = []

							result.push({
								text: <i class="icon icon-eye"></i>,
								title: 'Открыть документ',
								onClick: async () => {
									const { document, document_ref } = controller.data;

									if (document && document_ref) {
										const [table] = document.split('|');

										await editRecId(table, document_ref);
									}
								}
							});

							return result;
						}
					}
				},
				organization: {
					description: "Организация"
				},
				department: {
					description: "Отделение",
					config: {
						options: {
							filters: () => ([{ where: `"contragents_departments"."not_used" <> true` }])
						}
					}
				},
				status: {
					description: 'Статус',
					config: {
						watch: () => {
							this.setButtons();
						}
					}
				},
				json_data: {
					description: "JSON data"
				},
				created_at: {
					description: "Время создания"
				},
				results: {
					fields: {
						id: {
							description: "id",
							config: {
								hide: true
							}
						},
						owner: {
							description: "Владелец",
							config: {
								hide: true
							}
						},
						resource_type: {
							description: "Вид ресурса"
						},
						employee: {
							description: "Сотрудник"
						},
						created_at: {
							description: "Время"
						},
						json_data: {
							description: "JSON data",
							config: {
								hide: true
							}
						}
					}
				},
				employees: {
					description: "Сотрудники",
					fields: {
						id: {
							description: 'id',
							config: {
								visible: false
							}
						},
						owner: {
							description: 'Владелец',
							config: {
								visible: false
							}
						},
						employee: {
							description: 'Сотрудник'
						}
					}
				},
				history: {
					description: "История статусов",
					fields: {
						id: {
							description: 'id',
							config: {
								visible: false
							}
						},
						owner: {
							description: 'Владелец',
							config: {
								visible: false
							}
						},
						status: {
							description: 'Статус'
						},
						created_at: {
							description: "Время изменения"
						},
						employee: {
							description: 'Сотрудник'
						}
					}
				}
			}
		})
	}

	setButtons() {
		const panelFun: any = [];

		if (this.readonly.value) {
			panelFun.push({
				close: {
					class: 'btn btn-close'
				}
			});
		} else {
			panelFun.push({
				_saveClose: {
					caption: 'Сохранить и закрыть',
					title: 'Сохранить и закрыть',
					class: 'btn btn-save',
					onClick: async () => {
						const data = await this.save();
						if (data) this.props.panel.close(data);
					}
				},
				close: {
					class: 'btn btn-close'
				}
			});
		}

		if ([3, 7, 8, 9].includes(this.data.value.status)) {
			panelFun.push({
				returnToNew: {
					caption: 'На отправку',
					class: 'btn btn-status',
					onClick: async () => await this.returnToNew()
				}
			})

			if ([3].includes(this.data.value.status)) {
				panelFun.push({
					returnToNew: {
						caption: 'Ошибка отправки',
						class: 'btn btn-status',
						onClick: async () => await this.toErrorSend()
					}
				})
			}
		}

		this.createPanelFun(panelFun);
	}

	async toErrorSend() {
		Swal.fire({
			title: 'Отправить в ошибочные?',
			showCancelButton: true,
			confirmButtonText: 'Да',
			cancelButtonText: 'Отмена'
		}).then(async ({ value }) => {
			if (value) {
				try {
					const savedData = await setStatus(this.id, 8);

					if (savedData) {
						this.props.panel.close(savedData);

						bus.$emit('save-data', { table: 'cisz', removeRec: true, info: true, data: savedData });
					}
				} catch (error: any) {
					toastError(error.message || 'Ошибка при изменении статуса');
				}
			}
		});
	}

	async returnToNew() {
		Swal.fire({
			title: 'Вернуть на отправку?',
			showCancelButton: true,
			confirmButtonText: 'Да',
			cancelButtonText: 'Отмена'
		}).then(async ({ value }) => {
			if (value) {
				try {
					const savedData = await setStatus(this.id, 1);

					if (savedData) {
						this.props.panel.close(savedData);

						bus.$emit('save-data', { table: 'cisz', removeRec: true, info: true, data: savedData });
					}
				} catch (error: any) {
					toastError(error.message || 'Ошибка при изменении статуса');
				}
			}
		});
	}
}