<template>
    <!-- 1. HTML код -->
    <div v-if="typeof item === 'string'" v-html="item" ></div>

    <!-- 2. Уведомления -->
    <template v-else-if="item.value && typeof item.value === 'object' && !Array.isArray(item.value) && (item.value.information || item.value.warning || item.value.error)">
        <div class="alert alert-primary" role="alert" v-if="item.value.information">
            {{ item.value.information }}
            <Coding v-if="item.value.coding" :coding="item.value.coding"></Coding>
        </div>
        <div class="alert alert-warning" role="alert" v-if="item.value.warning">
            {{ item.value.warning }}
            <Coding v-if="item.value.coding" :coding="item.value.coding"></Coding>
        </div>
        <div class="alert alert-danger" role="alert" v-if="item.value.error">
            {{ item.value.error }}
            <Coding v-if="item.value.coding" :coding="item.value.coding"></Coding>
        </div>
    </template>

    <!-- 3. Таблица -->
    <template v-else-if="item.table">
        <dl class="row" v-if="item.label">
            <dt class="col-12">{{ item.label }}</dt>
        </dl>
        <div class="table-responsive mb-3">
            <table class="table table-bordered table-sm table-hover">
                <thead class="thead-light">
                    <tr>
                        <th v-for="(colLabel, colKey) in item.table.cols" :key="colKey">{{ colLabel }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, rowIdx) in item.table.rows" :key="rowIdx">
                        <td v-for="(colLabel, colKey) in item.table.cols" :key="colKey">
                            
                            <ViewCISZItem 
                                v-if="Array.isArray(row[colKey])" 
                                :item="{ value: row[colKey] }" 
                            />

                            <template v-else-if="typeof row[colKey] === 'object' && row[colKey] !== null">
                                <LinkCISZ v-if="row[colKey].reference" :label="row[colKey].value || row[colKey].reference" :reference="row[colKey].reference" />
                                <ViewCISZItem v-else-if="row[colKey].table || row[colKey].tabs" :item="row[colKey]" />
                                <span v-else-if="typeof row[colKey].value === 'string' && row[colKey].value.startsWith('<a ')" v-html="row[colKey].value"></span>
                                <span v-else>{{ row[colKey].value }}</span>
                            </template>
                            <template v-else-if="typeof row[colKey] === 'boolean'">
                                {{ row[colKey] ? 'Да' : 'Нет' }}
                            </template>
                            <span v-else-if="typeof row[colKey] === 'string' && row[colKey].startsWith('<a ')" v-html="row[colKey]"></span>
                            <template v-else>
                                {{ row[colKey] }}
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </template>

    <!-- 4. Табы сбоку -->
    <template v-else-if="item.tabs">
        <div class="row" v-if="!hideTabs"> 
            <div class="col-md-4"> 
                <div 
                    class="nav flex-column nav-pills overflow-auto flex-nowrap pr-1" 
                    role="tablist" 
                    aria-orientation="vertical"
                    style="height: 55vh;"
                > 
                    <template v-for="(tab, idx) in item.tabs" :key="idx">
                        
                        <template v-if="tab.subTabs">
                            <div 
                                class="nav-link p-0 d-flex align-items-stretch mb-1 w-100 border-0 rounded-3" 
                                :class="activeTab === idx ? 'active shadow-sm' : 'bg-light text-secondary'"
                            >
                                <div 
                                    class="flex-grow-1 text-left text-start text-truncate px-3 py-2 fw-bold"
                                    @click.prevent="activeTab = idx"
                                    style="cursor: pointer; user-select: none;"
                                    :title="tab.label"
                                >
                                    {{ tab.label }}
                                </div>
                                <div 
                                    class="px-3 py-2 d-flex align-items-center justify-content-center"
                                    @click.prevent.stop="toggleGroup(idx)"
                                    style="cursor: pointer; min-width: 40px; border-left: 1px solid rgba(128,128,128,0.2);"
                                >
                                    <i :class="expandedGroups.includes(idx) ? 'icon icon-chevron-up' : 'icon icon-chevron-down'"></i>
                                </div>
                            </div>

                            <div v-show="expandedGroups.includes(idx)" class="pl-2 border-left ml-2 mb-2">
                                <button 
                                    v-for="(subTab, subIdx) in tab.subTabs"  
                                    :key="subIdx" 
                                    class="nav-link text-left text-start text-truncate flex-shrink-0 mb-1 px-3 py-1 rounded-3 border-0 w-100"  
                                    :class="{ 
                                        'active shadow-sm fw-bold': activeTab === `${idx}-${subIdx}`,
                                        'text-secondary': activeTab !== `${idx}-${subIdx}` 
                                    }"  
                                    @click.prevent="activeTab = `${idx}-${subIdx}`"  
                                    type="button" 
                                    role="tab"
                                    style="outline: none;" 
                                    :title="subTab.label"
                                >
                                    {{ subTab.label }} 
                                </button>
                            </div>
                        </template>

                        <template v-else>
                            <button 
                                class="nav-link text-left text-start text-truncate flex-shrink-0 mb-1 px-3 py-2 rounded-3 border-0 w-100 fw-bold"  
                                :class="activeTab === idx ? 'active shadow-sm' : 'bg-light text-secondary'"  
                                @click.prevent="activeTab = idx"  
                                type="button" 
                                role="tab"
                                style="outline: none;" 
                                :title="tab.label"
                            >
                                {{ tab.label }} 
                            </button>
                        </template>
                    </template>
                </div> 
            </div> 
        
            <div class="col-md-8"> 
                <div 
                    class="tab-content bg-light shadow-sm rounded-3 p-2 overflow-auto"
                    style="height: 55vh;"
                > 
                    <template v-for="(tab, idx) in item.tabs" :key="'content-'+idx">
                        <template v-if="tab.subTabs">
                            
                            <div 
                                class="tab-pane fade" 
                                :class="{ 'show active': activeTab === idx }" 
                                role="tabpanel"
                            >
                                <template v-for="(subTab, subIdx) in tab.subTabs" :key="'all-'+subIdx">
                                    <ViewCISZItem v-for="(tabItem, i) in subTab.value" :key="i" :item="tabItem" :hideTabs="hideTabs" />
                                </template>
                            </div>

                            <div 
                                v-for="(subTab, subIdx) in tab.subTabs" 
                                :key="'sub-'+subIdx" 
                                class="tab-pane fade" 
                                :class="{ 'show active': activeTab === `${idx}-${subIdx}` }" 
                                role="tabpanel"
                            >
                                <ViewCISZItem v-for="(tabItem, i) in subTab.value" :key="i" :item="tabItem" :hideTabs="hideTabs" />
                            </div> 
                        </template>

                        <template v-else>
                            <div 
                                class="tab-pane fade" 
                                :class="{ 'show active': activeTab === idx }" 
                                role="tabpanel"
                            >
                                <ViewCISZItem v-for="(tabItem, i) in tab.value" :key="i" :item="tabItem" :hideTabs="hideTabs" />
                            </div> 
                        </template>
                    </template>
                </div> 
            </div> 
        </div> 

        <div class="col-12" v-else>
            <div 
                class="tab-content bg-light shadow-sm rounded-3 p-2 overflow-auto"
                style="height: 55vh;"
            > 
                <template v-for="(tab, idx) in item.tabs" :key="idx">
                    <template v-if="tab.subTabs">
                        <template v-for="(subTab, subIdx) in tab.subTabs" :key="subIdx">
                            <ViewCISZItem v-for="(tabItem, i) in subTab.value" :key="i" :item="tabItem" :hideTabs="hideTabs" />
                        </template>
                    </template>
                    <template v-else>
                        <ViewCISZItem v-for="(tabItem, i) in tab.value" :key="i" :item="tabItem" :hideTabs="hideTabs" />
                    </template>
                </template>
            </div> 
        </div>
    </template>

    <!-- 4.5. Карточки -->
    <template v-else-if="item.cards">
        <dl class="row mb-1" v-if="item.label">
            <dt class="col-12 font-weight-bold fw-bold text-secondary text-muted">
                {{ item.label }}
            </dt>
        </dl>
        
        <div class="row no-gutters">
            <div class="col-12 mb-1" v-for="(card, cIdx) in item.cards" :key="cIdx">
                
                <div class="bg-white border rounded py-1 px-2 shadow-xs">
                    
                    <div class="font-weight-bold fw-bold text-dark text-truncate mb-1" :title="card.title">
                        <LinkCISZ 
                            v-if="card.reference" 
                            :label="card.title" 
                            :reference="card.reference" 
                            class="text-decoration-none" 
                            :html="card.html"
                        />
                        <span v-else>{{ card.title }}</span>
                    </div>
                    
                    <div class="small" v-if="card.body && card.body.length">
                        <div 
                            v-for="(bItem, bIdx) in card.body" 
                            :key="bIdx" 
                            class="d-flex flex-wrap align-items-baseline mb-0 py-0 line-height-sm"
                        >
                            <span class="text-muted mr-1">{{ bItem.label }}:</span>
                            <span class="text-dark font-weight-medium">
                                <LinkCISZ 
                                    v-if="bItem.reference" 
                                    :label="bItem.value" 
                                    :reference="bItem.reference" 
                                />
                                <template v-else-if="Array.isArray(bItem.value)">
                                    {{ bItem.value.map(v => typeof v === 'object' ? v.value : v).join(', ') }}
                                </template>
                                <span v-else>{{ bItem.value }}</span>
                            </span>
                        </div>
                    </div>
                    
                </div>
                
            </div>
        </div>
    </template>

    <!-- 5. Value - массив -->
    <template v-else-if="Array.isArray(item.value)">
        <dl class="row mb-1" v-if="item.label">
            <dt class="col-12">{{ item.label }}</dt>
        </dl>
        <div class="pl-3 mb-1 border-left" style="border-left-width: 3px !important;">
            <ViewCISZItem v-for="(subItem, subIdx) in item.value" :key="subIdx" :item="subItem" />
        </div>
    </template>

    <!-- 6. Label + Value -->
    <dl class="row mb-1" v-else-if="item.label">
        <dt class="col-sm-4">{{ item.label }}</dt>
        <dd class="col-sm-8 mb-0" v-if="item.reference">
            <LinkCISZ :label="item.value" :reference="item.reference"></LinkCISZ>
        </dd>
        <dd class="col-sm-8 mb-0" v-else>{{ item.value }}</dd>
    </dl>

    <!-- 7. Value -->
    <div class="mb-1" v-else-if="item.value !== undefined">
        <LinkCISZ v-if="item.reference" :label="item.value" :reference="item.reference"></LinkCISZ>
        <div v-else-if="typeof item.value === 'string' && item.value.startsWith('<a ')" v-html="item.value"></div>
        <span v-else>{{ item.value }}</span>
    </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import LinkCISZ from '../LinkCISZ/index.vue';
import Coding from './Coding.vue';

export default defineComponent({
    name: 'ViewCISZItem',
    components: {
        LinkCISZ, Coding
    },
    props: {
        item: {
            required: true
        },
        hideTabs: {
            type: Boolean,
            default: false
        }
    },
    setup() {
        const activeTab = ref(0);
        
        const expandedGroups = ref([]); 

        const toggleGroup = (idx) => {
            if (expandedGroups.value.includes(idx)) {
                expandedGroups.value = expandedGroups.value.filter(i => i !== idx);
            } else {
                expandedGroups.value.push(idx);
            }
        };

        return {
            activeTab,
            expandedGroups,
            toggleGroup
        };
    }
})
</script>

<style scoped>
.line-height-sm {
    line-height: 1.25;
}
.shadow-xs {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
</style>