import { exists, xf, print, } from '../functions.js';
import { OAuthService, DialogMsg, stateParam, } from './enums.js';
import { uuid } from '../storage/uuid.js';
import Strava from './strava.js';
import Intervals from './intervals.js';
import TrainingPeaks from './training-peaks.js';
import Auth from './auth.js';

function Config() {
    // TODO:
    var process = process ?? {
        env: {
            API_URI: "http://localhost:8080",
            PWA_URI: "http://localhost:1234",
            STRAVA_CLIENT_ID: 0,
            INTERVALS_CLIENT_ID: 0,
            TRAINING_PEAKS_CLIENT_ID: 0,
        }
    };

    return {
        API_URI: process.env.API_URI,
        PWA_URI: process.env.PWA_URI,
        STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
        INTERVALS_CLIENT_ID: process.env.INTERVALS_CLIENT_ID,
        TRAINING_PEAKS_CLIENT_ID: process.env.TRAINING_PEAKS_CLIENT_ID,
    };
}

// TODO:
// - call status() first than handle params and other routing
// - setup service config after status()
function API() {
    const config = Config();
    const api_uri = config.API_URI;
    const pwa_uri = config.PWA_URI;
    const strava_client_id = config.STRAVA_CLIENT_ID;
    const intervals_client_id = config.INTERVALS_CLIENT_ID;
    const training_peaks_client_id = config.TRAINING_PEAKS_CLIENT_ID;

    const auth = Auth({config});
    const strava = Strava({config});
    const intervals = Intervals({config});
    const trainingPeaks = TrainingPeaks({config});
    const router = Router({handlers: {strava, intervals, trainingPeaks, auth}});

    function start() {
        router.start();
    }

    function stop() {
    }

    return Object.freeze({
        auth,
        strava,
        intervals,
        trainingPeaks,
        start,
        stop,
    });
}

// TODO: create a proper minimalist router
function Router(args = {}) {
    const strava = args.handlers.strava;
    const intervals = args.handlers.intervals;
    const trainingPeaks = args.handlers.trainingPeaks;
    const auth = args.handlers.auth;

    async function start() {
        const status = await auth.status();

        const params = getParams();
        if(hasParams(params)) {
            console.log(params);
            await onQueryParams(params);
        } else {
            // TODO: remove
            // get list of planned events once per period
            if(status.intervals) {
            }
        }
        return;
    }

    function getParams() {
        return (new URL(document.location)).searchParams;
    }

    function hasParams(params) {
        if(params) {
            return params.size > 0;
        } else {
            const params = (new URL(document.location)).searchParams;
            return params.size > 0;
        }
    }

    async function onQueryParams(params) {
        // strava params
        const state  = params.get('state');
        const code   = params.get('code');
        const scope  = params.get('scope');
        const error  = params.get('error');
        const token = params.get('token');

        // switch
        if(error) {
            console.error(`:api :param :error `, error);
            return true;
        }
        if(!error && (code || scope || state)) {
            const { service, id } = stateParam.decode(state);

            if(service === OAuthService.strava) {
                await strava.paramsHandler({state, code, scope});
            }
            if(service === OAuthService.intervals) {
                await intervals.paramsHandler({state, code, scope});
            }
            return true;
        }
        if(!error && token) {
            xf.dispatch('ui:page-set', 'settings');
            xf.dispatch('action:auth', ':password:reset');
            return true;
        }
        // clearParams();
        return false;
    }

    function clearParams() {
        window.history.pushState({}, document.title, window.location.pathname);
    }

    return Object.freeze({
        onQueryParams,
        clearParams,
        start,
    });
}


export default API;

