var r={object:function(r){return"object"==typeof r&&null!==r&&!Array.isArray(r)},number:function(r){return"number"==typeof r},string:function(r){return"string"==typeof r},array:function(r){return Array.isArray(r)},undef:function(r){return void 0===r},func:function(r){return"function"==typeof r},bool:function(r){return"boolean"==typeof r}},t=function(e,n){var i=!1;return!(!r.object(e)||!r.object(n))&&(Object.keys(n).forEach((function(o){if(r.object(e[o]))i=t(e[o],n[o]);else if(r.array(e[o])&&r.array(n[o]))for(var u=0,a=n[o].length;u<a;u++)r.object(e[o][u])?i=t(e[o][u],n[o][u]):e[o][u]!==n[o][u]&&(e[o][u]=n[o][u],i=!0);else e[o]!==n[o]&&(e[o]=n[o],i=!0)})),i)},e=function(t){if(r.object(t)){var n={};return Object.keys(t).forEach((function(r){n[r]=e(t[r])})),n}return Array.isArray(t)?t.map((function(r){return e(r)})):t},n=function(t,e){if(typeof t!=typeof e)return!1;if(r.string(t)||r.number(t)||r.bool(t))return t===e;if(Array.isArray(t)&&!Array.isArray(e)||!Array.isArray(t)&&Array.isArray(e))return!1;if(Array.isArray(t)&&Array.isArray(e)){if(t.length!==e.length)return!1;for(var i=t.length;i--;)if(!n(t[i],e[i]))return!1;return!0}if(r.object(t)&&r.object(e)){if(Object.keys(t).join("")!==Object.keys(e).join(""))return!1;var o=Object.keys(t);for(i=o.length;i--;)if(!n(t[o[i]],e[o[i]]))return!1;return!0}return!1},i=function(){function i(r,t){this.name=r,this.value=t,this.observers=[]}return i.prototype.get=function(){return void 0===this.value?void 0:e(this.value)},i.prototype.set=function(i){if(void 0===this.value)return this.value=e(i),this.changed(void 0),!0;if(r.array(i)&&r.array(this.value)||r.object(i)&&r.object(this.value)||r.number(i)&&r.number(this.value)||r.string(i)&&r.string(this.value)||r.bool(i)&&r.bool(this.value)){var o=!1,u=e(this.value);return Array.isArray(this.value)?(o=!n(this.value,i),this.value=e(i)):r.object(this.value)?o=t(this.value,i):(o=this.value!==i,this.value=i),o&&this.changed(u),o}return!1},i.prototype.observe=function(r){var t=this,e={id:"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(function(r){var t=16*Math.random()|0;return("x"===r?t:3&t|8).toString(16)})),observe:r};return this.observers.push(e),function(){t.stop(e.id)}},i.prototype.stop=function(r){for(var t=this.observers.length;t--;)if(this.observers[t].id===r)return this.observers.splice(t,1),!0;return!1},i.prototype.changed=function(r){var t=this.get();this.observers.forEach((function(e){e.observe(t,r)}))},i}(),o=[];function u(t,e){var n=function(r,t){var e=o.find((function(t){return t.name===r}));return void 0!==t&&(null==e||e.set(t)),e||(e=new i(r,t),o.push(e)),e}(t,e);return function(t){return r.undef(t)?n.get():"function"==typeof t?n.observe(t):n.set(t)}}export{u as default};
