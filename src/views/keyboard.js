import { xf, exists } from '../functions.js';
import { ControlMode, } from '../ble/enums.js';

function Keyboard() {

    const isKeyUp        = (key) => key === 'ArrowUp';
    const isKeyDown      = (key) => key === 'ArrowDown';
    const isKeyPageUp    = (key) => key === 'PageUp';
    const isKeyPageDown  = (key) => key === 'PageDown';
    const isKeyAdd       = (key) => key === '+';
    const isKeySubtract  = (key) => key === '-';
    const isKeyE         = (key) => key === 'E' || key === 'e' ;
    const isKeyR         = (key) => key === 'R' || key === 'r' ;
    const isKeyS         = (key) => key === 'S' || key === 's' ;
    const isKeyL         = (key) => key === 'L' || key === 'l' ;
    const isKeySpace     = (key) => key === ' ';

    window.addEventListener('keydown', onKeydown.bind(this));

    function onKeydown(e) {
        let keyCode = e.keyCode;
        let key = e.key;

        if (e.isComposing ||
            keyCode === 229 ||  
            e.ctrlKey ||
            e.shiftKey ||
            e.altKey ||
            exists(e.target.form)) {
            return;
        }

        if(isKeyUp(key)) {
            e.preventDefault();
            xf.dispatch('key:up-10');
        }
        if(isKeyDown(key)) {
            e.preventDefault();
            xf.dispatch('key:down-10');
        }
        if(isKeyPageUp(key)) {
            e.preventDefault();
            xf.dispatch('key:up-5');
        }
        if(isKeyPageDown(key)) {
            e.preventDefault();
            xf.dispatch('key:down-5');
        }
        if(isKeyAdd(key)) {
            e.preventDefault();
            xf.dispatch('key:up-1');
        }
        if(isKeySubtract(key)) {
            e.preventDefault();
            xf.dispatch('key:down-1');
        }
        if(isKeyS(key)) {
            xf.dispatch('key:s');
        }
        if(isKeyR(key)) {
            xf.dispatch('key:r');
        }
        if(isKeyE(key)) {
            xf.dispatch('key:e');
        }
        if(isKeyL(key)) {
            xf.dispatch('key:l');
        }
        if(isKeySpace(key)) {
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
