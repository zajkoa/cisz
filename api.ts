import api from "@/core/api/api";

export const setResult = (id: string, data: any = {}) => api.query(`/cisz/setresult/${id}`, { data, method: "post" });
export const getPatientReference = (id: string) => api.query(`/cisz/getpatientreference/${id}`);

export const createBundle = (id: string, data: any = {}) => api.query(`/cisz/createbundle/${id}`, { data, method: "post" });
export const viewResource = (data: any) => api.query(`/cisz/viewresource`, { data, method: "post" });
export const parseResource = (data: any) => api.query(`/cisz/parseresource`, { data, method: "post" });
export const createFromResource = (data: any) => api.query(`/cisz/createfromresource`, { data, method: "post" });

export const toCISZ = (data: any) => api.query(`/cisz/tocisz`, { data, method: "post" });
export const ciszInfo = (data: any) => api.query(`/cisz/info`, { method: "post", data });

export const setStatus = (id: string, status: number) => api.query(`/cisz/setstatus/${id}/${status}`, { method: "post" });
