export const APP_INIT_REQUEST = 'app/INIT_REQUEST';
export const APP_INIT_SUCCESS = 'app/INIT_SUCCESS';   // payload: InitResponse
export const APP_INIT_FAILURE = 'app/INIT_FAILURE';   // payload: string (error)
export const APP_TOGGLE_THEME = 'app/TOGGLE_THEME';   // no payload

export const MENU_SET_ITEMS = 'menu/SET_ITEMS';       // payload: MenuNode[]
export const MENU_TOGGLE_NODE = 'menu/TOGGLE_NODE';   // payload: nodeId
export const MENU_SELECT_REPORT = 'menu/SELECT_REPORT'; // payload: { reportId }
