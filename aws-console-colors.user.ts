const getNavElements = (document: Document) => {
    const consoleNavHeader = document.getElementById("consoleNavHeader")
    if (consoleNavHeader == null) {
        return { error: new Error("#consoleNavHeader not found") }
    }

    const container = consoleNavHeader?.querySelector("#awsc-navigation-container")
    if (container == null) {
        return { error: new Error("#awsc-navigation-container not found") }
    }

    const switcher = container.querySelector("[data-testid='account-menu-button__background']") as HTMLElement
    if (switcher == null) {
        return { error: new Error("switcher element not found") }
    }

    return { consoleNavHeader, container, switcher }
}

// eslint-disable-next-line
const getNavElementsAsync = (document: Document, maxRetryTimes: number, retryIntervalInMilliseconds: number) =>
    new Promise<{ consoleNavHeader: Element, container: Element, switcher: HTMLElement }>((resolve, reject) => {
        const fn = (retryCount: number) => {
            const { container, switcher, consoleNavHeader, error } = getNavElements(document)
            if (error != null) {
                if (retryCount >= maxRetryTimes) {
                    reject(error)
                }
                setTimeout(() => fn(retryCount + 1), retryIntervalInMilliseconds)
                return
            }

            resolve({ container, switcher, consoleNavHeader })
        }
        fn(0)
    })

const determineNewColor = (rgbColor: string, saturation = 1.0, luminosity = 0.25) => {
    const f = rgbColor.split(",")
    const r = parseInt(f[0].slice(4)) / 255
    const g = parseInt(f[1]) / 255
    const b = parseInt(f[2]) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h
    if (max === min) {
        h = saturation = 0 // achromatic
    } else {
        const d = max - min
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
            default: throw new Error()
        }
        h /= 6
    }
    return `hsl(${Math.floor(h * 360)},${Math.floor(saturation * 100)}%,${Math.floor(luminosity * 100)}%)`
}

// eslint-disable-next-line
const setNavColorAsync = (document: Document, roleSettings: Array<{pattern:RegExp, color?:string}>) => new Promise<{ contentBgColor: string }>((resolve, reject) => {
    getNavElementsAsync(document, 300, 100).then(result => {
        const { container, switcher, consoleNavHeader } = result

        const observer = new MutationObserver((__, observer) => {
            observer.disconnect()
            const role = switcher.parentElement?.innerText?.trim()
            const bgColor = switcher.style.backgroundColor

            const roleSetting = roleSettings.find(x => x.pattern.test(role ?? ""));
            let newBgColor: string
            let contentBgColor: string
            if (role != null && roleSetting?.pattern.test(role)) {
                newBgColor = roleSetting.color ?? ""
                contentBgColor = roleSetting.color ?? ""
            } else {
                newBgColor = determineNewColor(bgColor)
                contentBgColor = determineNewColor(bgColor, 0.95, 0.90)
            }

            console.log("AWS-NAV-COLORING", { container, switcher, role, bgColor, newBgColor, contentBgColor })

            if (newBgColor != "") {
                const navs = container.querySelectorAll("nav")
                for (let i = 0, l = navs.length; i < l; i++) {
                    navs[i].style.backgroundColor = newBgColor
                }    
            }

            resolve({ contentBgColor })    
        })

        observer.observe(consoleNavHeader, { childList: true })
    }).catch(reject)
})

export {
    getNavElements,
    getNavElementsAsync,
    determineNewColor,
    setNavColorAsync
}
