import test from 'node:test';
import assert from 'node:assert/strict';
import {videoTime,seekPosition} from '../src/shared/utils/video.js';
test('video time handles metadata not yet loaded and long videos',()=>{assert.equal(videoTime(NaN),'0:00');assert.equal(videoTime(Infinity),'0:00');assert.equal(videoTime(65.9),'1:05');assert.equal(videoTime(3661),'1:01:01');});
test('seeking stays within available media duration',()=>{assert.equal(seekPosition(-5,20),0);assert.equal(seekPosition(25,20),20);assert.equal(seekPosition(7.5,20),7.5);assert.equal(seekPosition(5,NaN),0);});
