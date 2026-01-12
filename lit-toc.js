import { LitElement, html } from 'lit'
import StickyController from '../../commons/lit-controllers/StickyController.js'
import ToggleController from '../../commons/lit-controllers/TocController.js'
import ToggleControllerAttributes from '../../commons/lit-controllers/ToggleController.attributes.js'

export default class LitToc extends LitElement {
	/*
		@Attributes:
			[src] // selector of element containing the content
			[levels] //
	*/
	static properties = {
		// public
		levels: { type: String, reflect: true },
		src: { type: String, reflect: true, attribute: 'src' }, // <selector>
		items: { attribute: false }, // []
		// toggle controller
		...ToggleControllerAttributes,
		// sticky controller
		sticky: { type: String, reflect: true }, // 'smart', 'true'
	}

	static dictionary = {
		'toc': {
			de: 'Inhaltsverzeichnis',
			en: 'Table Of Contents'
		},
	}

	static translate(key) {
		this._lang ??= (document.documentElement.lang !== '') ? document.documentElement.lang : 'de'
		if (!this.dictionary[key]) {
			return 'undefined'
		}
		return this.dictionary[key][this._lang]
	}

	constructor() {
		super()
	}

	connectedCallback() {
		super.connectedCallback()
		// init
		this.role ??= 'navigation'
		this.ariaLabel = LitToc.translate('toc')
		this.levels ??= 'H1,H2' // no whitespace!
		this.className = 'toc'
		this._lang = document.documentElement._lang
		this._lang = (this._lang === '') ? 'de' : this._lang

		// controllers
		if (this.sticky && this.sticky !== 'false') {
			this._sticky = new StickyController(this, {
				mode: this.sticky
			})
		}
		if (this.toggle && this.toggle !== 'false') {
			this._toggle = new ToggleController(this, {
				on: this.toggleOn,
				off: this.toggleOff,
				overlay: this.toggleOverlay,
				anim: this.toggleAnim,
				state: this.toggleState,
			})
		}
	}

	createRenderRoot() {
		return this
	}

	render() {
		return html`
			${(this._toggle) ? this._toggle.render() : ''}
			${this._renderContent()}`
	}

	_renderContent() {
		// get elements
		if (this.src) {
			this.srcElement ??= document.querySelector(this.src)
			if (!this.srcElement) throw new Error(`this.srcElement = "${this.srcElement}", this.src = "${this.src}"`)	
			
			return this._createStaticList(this.srcElement, this.levels)
		}
		if (this.items) {
			return html`
				<ul class="content">
					${this.items.map(item => {
						return html`
							<li>
								<a 
									class="toc-item"
									@click=${evt => this._scrollToPost(evt)}
									data-dest="${item.id}"
									href="#${item.id}">${item.title}
								</a>			
							</li>`
					})}
				</ul>`
		}
	}

	_createStaticList(article, headingLvls) {
		/*
			Return a <ul> with table of contents
		*/

		if (typeof headingLvls === 'string') {
			headingLvls = headingLvls.replace(' ', '').toUpperCase().split(',') // --> ['H1','H2','H3']	
		}

		headingLvls = headingLvls.map(lvl => (/^[0-9]$/.test(lvl)) ? `H${lvl}` : lvl)

		// loop through headings
		const headings = article.querySelectorAll(headingLvls)
		let list = document.createElement('ul')
		list.className = 'content'
		let lastLevel = 1

		for (let i = 0; i < headings.length; i++) {
			const heading = headings[i]
			// * make sure all headers have an id
			// * create anchors and list items 
			let id

			// heading
			let lvl = parseInt(heading.tagName[1]) // H1 --> 1 (extract humber from tagName)
			heading.dataset.lvl = lvl
			if (heading.id) {
				id = heading.id
			}
			else {
				id = `h${lvl}-${i}` // lvl1-h1 (tag heading with a a unique id)
				heading.id = id
			}

			// anchor
			const anchor = document.createElement('a')
			anchor.href = `#${id}`
			anchor.textContent = heading.textContent
			anchor.addEventListener('click', evt => this._scrollToHeading(evt, id))

			// li
			const li = document.createElement('li')
			li.append(anchor)
			li.dataset.lvl = lvl

			if (lvl > lastLevel) {
				// More indentation, make a new list per lvl
				for (let i = 0; i < lvl - lastLevel; ++i) {
					const childList = document.createElement('ul')
					list.append(childList)
					list = childList
				}
			}
			else if (lvl < lastLevel) {
				// Less indentation, move back a few levels
				for (let i = 0; i < lastLevel - lvl; ++i) {
					list = list.parentNode;
				}
			}

			list.append(li)
			lastLevel = lvl

			if (i === headings.length - 1) {
				// At the end go back until start lvl
				for (let i = lvl; i === 2; ++i) {
					list = list.parentNode;
				}
			}
		}

		return list
	}

	_scrollToHeading(evt, destID) {
		// @click
		evt.preventDefault()
		const dest = document.getElementById(destID)
		const isInViewport = this._isInViewport(dest)
		const scrolledClass = 'scrolledTo'
		dest.classList.toggle(scrolledClass, false) // toggle = false: token will only be removed, but not added
		dest.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
		// block: Defines vertical alignment. One of start, center, end, or nearest.
		// inline: Defines horizontal alignment. One of start, center, end, or nearest.


		if (isInViewport) {
			// add 'scrolledTo' immediately if no scroll happened
			dest.classList.add(scrolledClass)
		} else {
			// add 'scrolledTo' on scroll end
			document.addEventListener('scrollend', (evt) => {
				dest.classList.add(scrolledClass)
			}, { once: true, passive: true });
		}

		setTimeout(() => {
			dest.classList.remove(scrolledClass)
		}, 4000)
	}

	_isInViewport(element) {
		const rect = element.getBoundingClientRect();
		return (
			rect.top >= 0 &&
			rect.left >= 0 &&
			rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
			rect.right <= (window.innerWidth || document.documentElement.clientWidth)
		);
	}
}

window.customElements.define('lit-toc', LitToc);