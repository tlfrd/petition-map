(function($) {

  function getUrl() {
    return $('.vex-content .share-panel input[name=petition-link]').val();
  }

  // Creates and opens window for twitter sharing
  function tweetCurrentPage() {
    var link = getUrl();

    window.open("https://twitter.com/share?url="+escape(link)+"&text="+encodeURIComponent("Check out this petition map")+"&hashtags=petitionmap", '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');
    return false;
  }

  // Creates and opens window for facebook sharing
  function facebookCurrentPage() {
    var link = getUrl();

    window.open("https://www.facebook.com/sharer/sharer.php?u="+escape(link)+"&t="+encodeURIComponent("Petition Map (By Unboxed)"), '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600');
    return false;
  }

  $('body').on('click', '.vex-content .share-panel .twitter', tweetCurrentPage);

  $('body').on('click', '.vex-content .share-panel .facebook', facebookCurrentPage);

})(window.jQuery);
