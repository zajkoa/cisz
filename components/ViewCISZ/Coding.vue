<template>
    <table class="table table-hover table-sm" v-if="coding.length > 0">
        <thead>
            <tr>
                <th scope="col">code</th>
                <th scope="col">system</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="value in coding">
                <td>{{ value.code }}</td>
                <td>{{ value.system }}</td>
            </tr>
        </tbody>
    </table>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
    inheritAttrs: false,

    props: {
        coding: {
            type: Array,
            default: () => []
        }
    }
})
</script>

<style></style>