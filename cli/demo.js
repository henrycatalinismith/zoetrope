document.addEventListener(
  "DOMContentLoaded",
  () => {
    const request = new XMLHttpRequest
    const body = document.createElement("body")
    const style = document.createElement("style")
    const loading = document.querySelector("[aria-label='loading'] path")
    let before = Date.now()

    request.onloadstart = () => {
      before = Date.now()
    }

    request.onprogress = (event) => {
      const after = Date.now()
      document.documentElement.style.setProperty(
        "--loadingBarTransitionDuration",
        `${(after - before) * 2}ms`
      )
      loading.style.strokeDashoffset = 256 - (
        256 * event.loaded / event.total
      )
      before = after
    }

    request.onload = () => {
      loading.style.strokeDashoffset = 0
      setTimeout(() => {
        document.body.dataset.mode = "play"
        style.innerText = request.response
        setTimeout(() => {
          document
            .head
            .querySelector("style")
            .replaceWith(style)
          document
            .body
            .replaceWith(body)
        }, Math.pow(2, 8))
      }, Math.pow(2, 8))
    }

    document
      .querySelector("[aria-label='play']")
      .addEventListener(
        "click",
        () => {
          document.body.dataset.mode = "load"
          request.open("GET", "{{ url }}/{{ metadata.main | replace(".scss", "") }}-{{ version }}.css")
          request.send()
        }
      )

    {% if autoplay %}
      document.body.dataset.mode = "load"
      request.open("GET", "{{ url }}/{{ metadata.main | replace(".scss", "") }}-{{ version }}.css")
      request.send()
    {% endif %}

  }
)

