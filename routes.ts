export const ciszRoutes = [
    {
        path: '/cisz/login',
        component: () => import('./pages/Login.vue'),
    },
    {
        path: '/map/login',
        component: () => import('./pages/Login.vue'),
    },
    {
        path: '/cisz/logout',
        component: () => import('./pages/Logout.vue'),
    },
    {
        path: '/map/logout',
        component: () => import('./pages/Logout.vue'),
    }
];

export default ciszRoutes;
