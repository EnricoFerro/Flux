import { xf, exists } from '../functions.js';
import { ControlMode, } from '../ble/enums.js';

function Keyboard() {

    const isKeyUp        = (code) => code === 'ArrowUp';
    const isKeyDown      = (code) => code === 'ArrowDown';
    const isKeyPageUp    = (code) => code === 'PageUp';
    const isKeyPageDown  = (code) => code === 'PageDown';
    const isKeyAdd       = (code) => code === 'NumpadAdd';
    const isKeySubtract  = (code) => code === 'NumpadSubtract';
    const isKeyE         = (code) => code === 'KeyE';
    const isKeyR         = (code) => code === 'KeyR';
    const isKeyS         = (code) => code === 'KeyS';
    const isKeyL         = (code) => code === 'KeyL';
    const isKeySpace     = (code) => code === 'Space';

    window.addEventListener('keydown', onKeydown.bind(this));

    function onKeydown(e) {
        let keyCode = e.keyCode;
        let code = e.code;

        if (e.isComposing ||
            keyCode === 229 ||  
            e.ctrlKey ||
            e.shiftKey ||
            e.altKey ||
            exists(e.target.form)) {
            return;
        }

        if(isKeyUp(code)) {
            e.preventDefault();
            xf.dispatch('key:up-5');
        }
        if(isKeyDown(code)) {
            e.preventDefault();
            xf.dispatch('key:down-5');
        }
        if(isKeyPageUp(code)) {
            e.preventDefault();
            xf.dispatch('key:up-10');
        }
        if(isKeyPageDown(code)) {
            e.preventDefault();
            xf.dispatch('key:down-10');
        }
        if(isKeyAdd(code)) {
            e.preventDefault();
            xf.dispatch('key:up-1');
        }
        if(isKeySubtract(code)) {
            e.preventDefault();
            xf.dispatch('key:down-1');
        }
        if(isKeyS(code)) {
            xf.dispatch('key:s');
        }
        if(isKeyR(code)) {
            xf.dispatch('key:r');
        }
        if(isKeyE(code)) {
            xf.dispatch('key:e');
        }
        if(isKeyL(code)) {
            xf.dispatch('key:l');
        }
        if(isKeySpace(code)) {
            e.preventDefault();
            xf.dispatch('key:space');
        }
    }
}


function KeyboardControls() {
    let mode = ControlMode.erg;
    xf.sub('db:mode', x => mode = x);

    let watchStatus = 'stopped';
    xf.sub('db:watchStatus', x => watchStatus = x);

    // Modes Inc/Dec
    xf.sub('key:up-10', e => {
        if(mode === ControlMode.erg) {
            xf.dispatch('ui:power-target-inc');
        }
        if(mode === ControlMode.resistance) {
            xf.dispatch('ui:resistance-target-inc');
        }
        if(mode === ControlMode.sim) {
            xf.dispatch('ui:slope-target-inc');
        }
    });
    xf.sub('key:down-10', e => {
        if(mode === ControlMode.erg) {
            xf.dispatch('ui:power-target-dec');
        }
        if(mode === ControlMode.resistance) {
            xf.dispatch('ui:resistance-target-dec');
        }
        if(mode === ControlMode.sim) {
            xf.dispatch('ui:slope-target-dec');
        }
    });
    xf.sub('key:up-5', e => {
        if(mode === ControlMode.erg) {
            xf.dispatch('ui:power-target-inc-5');
        }
        if(mode === ControlMode.resistance) {
            xf.dispatch('ui:resistance-target-inc-5');
        }
        if(mode === ControlMode.sim) {
            xf.dispatch('ui:slope-target-inc-5');
        }
    });
    xf.sub('key:down-5', e => {
        if(mode === ControlMode.erg) {
            xf.dispatch('ui:power-target-dec-5');
        }
        if(mode === ControlMode.resistance) {
            xf.dispatch('ui:resistance-target-dec-5');
        }
        if(mode === ControlMode.sim) {
            xf.dispatch('ui:slope-target-dec-5');
        }
    });
    xf.sub('key:up-1', e => {
        if(mode === ControlMode.erg) {
            xf.dispatch('ui:power-target-inc-1');
        }
        if(mode === ControlMode.resistance) {
            xf.dispatch('ui:resistance-target-inc-1');
        }
        if(mode === ControlMode.sim) {
            xf.dispatch('ui:slope-target-inc-1');
        }
    });
    xf.sub('key:down-1', e => {
        if(mode === ControlMode.erg) {
            xf.dispatch('ui:power-target-dec-1');
        }
        if(mode === ControlMode.resistance) {
            xf.dispatch('ui:resistance-target-dec-1');
        }
        if(mode === ControlMode.sim) {
            xf.dispatch('ui:slope-target-dec-1');
        }
    });

    // Modes
    xf.sub('key:e', e => {
        xf.dispatch('ui:mode-set', ControlMode.erg);
    });
    xf.sub('key:r', e => {
        xf.dispatch('ui:mode-set', ControlMode.resistance);
    });
    xf.sub('key:s', e => {
        xf.dispatch('ui:mode-set', ControlMode.sim);
    });

    // Watch
    xf.sub('key:space', e => {
        if(watchStatus === 'paused' || watchStatus === 'stopped') {
            xf.dispatch('ui:watchStart');
        } else {
            xf.dispatch('ui:watchPause');
        }
    });
    xf.sub('key:l', e => {
        xf.dispatch('ui:watchLap');
    });
}

Keyboard();
KeyboardControls();

export { Keyboard, KeyboardControls };
