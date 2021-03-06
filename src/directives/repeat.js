var _ = require("../util")
var $ = require("../dom")
var common = require("../common")
var config = require("../config")
var components = common.components
var objectPath = require("../object-path")
var cid = 0
var prefix = config.directivePrefix

module.exports = {
  bind: function(ele, attr, component, dir) {
    var id = cid++
    var $ele = $(ele)
    var placeholder = document.createComment("repeat " + dir + " " + id)
    var endPlaceholder = document.createComment("repeat " + dir + " end " + id)
    var holders = [placeholder, endPlaceholder]
    $ele.before(placeholder)
    $ele.before(endPlaceholder)

    $ele.remove()
    $ele.removeAttr(attr.name)

    generateListSetCache(ele, attr, component, dir, id, holders)
    watchArrayChangeAndRender(ele, attr, component, holders, id, dir)

    $ele.attr(prefix + "-ignore", "true")
  }
}

function generateListSetCache(ele, attr, component, dir, id, holders) {
  var tpl = getTplFromElement(ele)
  var TempComp = common.component({
    template: tpl,
    notEmitter: true // Nobody will emit event on components without references.
  })

  // function F() {}
  // F.prototype = component.constructor.prototype
  // TempComp.prototype = new F

  var components = makeList(ele, component, dir, TempComp, holders[1])
  setRepeatCache(component, id, {
    Component: TempComp,
    holders: holders,
    components: components
  })
  return holders
}

function watchArrayChangeAndRender(ele, attr, component, holders, id, dir) {
  var scope = component.scope
  var path = component.scope.getScopeAndWatchPath(attr.value).watchPath
  scope.watchArray(path, function(action, data) {
    var cache = getRepeatCache(component, id)
    var start = cache.holders[0]
    var current = start.nextSibling
    var end = cache.holders[1]

    function clearAndReplace() {
      while(current !== end) {
        var next = current.nextSibling
        $(current).remove()
        current = next
      }
      _.each(cache.components, function(comp) {
        component.scope.removeSubScope(comp.scope)
      })
      var components = makeList(ele, component, dir, cache.Component, cache.holders[1])
      cache.components = components
    }

    switch(action) {
      case "pop":
        if (end.previousSibling !== start) {
          $(end.previousSibling).remove()
          var lastComp = cache.components.pop()
          scope.removeSubScope(lastComp.scope)
        }
        break
      case "push":
        _.each(data, function(state, i) {
          var len = cache.components.length
          var newPath = objectPath.join([component.scope.currentPath, dir, len])
          var comp = new cache.Component({state: state}, {
            currentPath: newPath,
            parent: component,
            extra: {
              $index: len,
              $item: state
            }
          })
          cache.components.push(comp)
          $(end).before(comp.el)
        })
        break
      default:
        clearAndReplace()
        break
    }

  })
}

function makeList(ele, component, dir, TempComp, endPlaceholder) {
  var frag = $.frag()
  var states = component.scope.getObjectByPath(dir)
  var components = []
  _.each(states, function(state, i) {
    var newComponent = new TempComp({state: state}, {
      currentPath: objectPath.join([component.scope.currentPath, dir, i]),
      parent: component,
      extra: {
        $index: i,
        $item: state
      }
    })
    components.push(newComponent)
    frag.appendChild(newComponent.el)
  })
  $(endPlaceholder).before(frag)
  return components
}


function getTplFromElement(ele) {
    var div = $.ele("div")
    div.appendChild(ele)
    return div.innerHTML
}

function getRepeatCache(component, id) {
  return component.scope.$root.repeatCache[id]
}

function setRepeatCache(component, id, data) {
  var root = component.scope.$root
  if (!root.repeatCache) {
    root.repeatCache = []
  }
  root.repeatCache[id] = data
}

function transformScope(scope, newIndex) {
  var currentPath = scope.currentPath
  var prefix = currentPath.replace(/\.\d+$/, "")
}
