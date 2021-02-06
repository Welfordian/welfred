<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
  import {ipcRenderer} from 'electron'

  export default {
    name: 'Welfred'
  }
</script>

<style>
  html, body {
    overflow: hidden;
  }
</style>
