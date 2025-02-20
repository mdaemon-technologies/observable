var r,t=(r=function(r,t){return typeof r===t},{object:function(t){return r(t,"object")&&null!==t&&!Array.isArray(t)},number:function(t){return r(t,"number")},string:function(t){return r(t,"string")},array:function(r){return Array.isArray(r)},undef:function(t){return r(t,"undefined")},func:function(t){return r(t,"function")},bool:function(t){return r(t,"boolean")}}),e=function(r,o){if(!t.object(r)||!t.object(o))return!1;var u=!1;return Object.keys(o).forEach((function(i){t.object(r[i])?u=e(r[i],o[i]):t.array(r[i])&&t.array(o[i])?u=n(r[i],o[i]):r[i]!==o[i]&&(r[i]=o[i],u=!0)})),u},n=function(r,n){for(var o=!1,u=0,i=n.length;u<i;u++)t.object(r[u])?o=e(r[u],n[u]):r[u]!==n[u]&&(r[u]=n[u],o=!0);return o},o=function(r){if(t.object(r)){var e={};for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=o(r[n]));return e}return Array.isArray(r)?r.map((function(r){return o(r)})):r},u=function(r,e,n){return void 0===n&&(n=new WeakMap),r===e||typeof r==typeof e&&(Array.isArray(r)&&Array.isArray(e)?i(r,e,n):!(!t.object(r)||!t.object(e))&&a(r,e,n))},i=function(r,t,e){return r.length===t.length&&r.every((function(r,e){return u(r,t[e])}),e)},a=function(r,t,e){var n=Object.keys(r),o=Object.keys(t);return n.length===o.length&&n.every((function(e){return u(r[e],t[e])}),e)},s=function(){function r(r,t){this.name=r,this.value=t,this.observers=[]}return r.prototype.get=function(){return void 0===this.value?void 0:o(this.value)},r.prototype.set=function(r){if(void 0===this.value)return this.value=o(r),this.changed(void 0),!0;var n,i;if(n=r,i=this.value,t.array(n)&&t.array(i)||t.object(n)&&t.object(i)||t.number(n)&&t.number(i)||t.string(n)&&t.string(i)||t.bool(n)&&t.bool(i)){var a=!1,s=o(this.value);return t.array(this.value)?(a=!u(this.value,r),this.value=o(r)):t.object(this.value)?a=e(this.value,r):(a=this.value!==r,this.value=r),a&&this.changed(s),a}return!1},r.prototype.observe=function(r){var t=this,e={id:"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(function(r){var t=16*Math.random()|0;return("x"===r?t:3&t|8).toString(16)})),observe:r};return this.observers.push(e),function(){t.stop(e.id)}},r.prototype.stop=function(r){for(var t=this.observers.length;t--;)if(this.observers[t].id===r)return this.observers.splice(t,1),!0;return!1},r.prototype.changed=function(r){var t=this.get();this.observers.forEach((function(e){e.observe(t,r)}))},r}(),c=[];function f(r,e){var n=function(r,t){var e=c.find((function(t){return t.name===r}));return void 0!==t&&(null==e||e.set(t)),e||(e=new s(r,t),c.push(e)),e}(r,e);return function(e){if(t.undef(e))return n.get();if(e!=="destroy-observable-"+r)return"function"==typeof e?n.observe(e):n.set(e);var o=c.indexOf(n);o>-1&&c.splice(o,1)}}export{f as default};
