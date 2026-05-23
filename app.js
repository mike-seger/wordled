import { loadWordsFromURL } from './util.js'

class WordledGame {
    constructor() {
		loadWordsFromURL('wordlist.txt').then((words) => {
			this.words = words
			this.container = document.createElement('div')
			this.container.id = 'container'
			document.body.append(this.container)
			this.resetGame()
			this.addEventListeners()
            this.fitToViewport()
		})
    }

    resetGame() {
        this.currentRow = 0
        this.nextRowBlock = 0
        this.score = 0
        this.finished = false
		const rand = Math.floor(Math.random() * this.words.length)
        this.chosenWord = this.words[rand]
        this.container.innerHTML = ''
		this.createUI()
        requestAnimationFrame(() => this.fitToViewport())
		if(window.solveWindow && window.solveWindow.closed)
			window.solveWindow.postMessage('X', '*') 
    }

    createUI() {
        this.addLogo()
        this.addGameArea()
        this.notification = this.addElement('div', null, 'notification', 'Start guessing!')
        this.addKeyboard()
    }

    addLogo() {
        const logo = this.addElement('div', 'logo', 'logo')
        const domName = 'WORDLED'
        const spanClasses = ['logo_green', 'logo_gold']

        domName.split('').forEach((char, idx) => {
            const logoSpan = this.addElement('span', spanClasses[idx % 2], null, char, logo)
        })

		logo.addEventListener('click', (e) => {
			let dialog = document.querySelector("dialog");
			if(!dialog) {
				dialog = this.addElement('dialog', null, 'dialog')
				dialog.addEventListener("click", () => { dialog.close() })
				this.addBtn('Give Up', 'giveUpBtn', this.quit.bind(this), dialog)
				this.addBtn('Restart Game', 'restartBtn', this.resetGame.bind(this), dialog)
				this.addBtn('Solve', 'solveBtn', this.solve.bind(this), dialog)
			}
			
			dialog.showModal()
		})
    }

    addGameArea() {
        const gameArea = this.addElement('div', 'game_area')
        for (let i = 0; i < 6; i++) {
            const row = this.addElement('div', 'row', null, null, gameArea)
            for (let j = 0; j < 5; j++) {
                this.addElement('div', 'row_block', null, null, row)
            }
        }
    }

    addKeyboard() {
        const keyboard = this.addElement('div', 'keyboard')

        const layouts = [
            { id: 'topKeys', keys: 'QWERTYUIOP', class: 'keyboardKey_s' },
            { id: 'midKeys', keys: 'ASDFGHJKL', class: 'keyboardKey_m' },
            { id: 'botKeys', keys: 'ZXCVBNM', class: 'keyboardKey_s' }
        ]

        layouts.forEach(layout => {
            const el = this.addElement('div', null, layout.id, null, keyboard)
            this.addKeys(el, layout.keys, layout.class)
        })

		let botKeys = document.getElementById('botKeys')
		this.addEnterKey(botKeys)
		this.addDeleteKey(botKeys)
    }

	addDeleteKey(parent) {
		let deleteKey = this.addElement('span', 'keyboardKey_l keyboardKey_Delete', null, '⬅', parent)
		let obj = this
		deleteKey.addEventListener("click", function deleteClick(event) {
			if(!obj.finished){
				let wordRow = document.getElementsByClassName('row')[obj.currentRow]
				let rowBlockEl = wordRow.childNodes
				obj.deleteLetter(rowBlockEl)
			}
		})
	}

	addEnterKey(parent) {
		let enterKey = this.addElement('span', 'keyboardKey_l keyboardKey_Enter', null, 'Enter', parent, false)
		enterKey.addEventListener("click", () => {
			if(!this.finished) this.submitWord()
			else this.resetGame()
		})
	}

    addKeys(el, layout, keyClass) {
        layout.split('').forEach(char => {
            const key = this.addElement('span', keyClass, `keyboard_${char}`, char, el)
            key.addEventListener('click', () => this.handleKeyPress(char))
        })
    }

    addElement(tag, className, id, text, parent = this.container, append = true) {
        const el = document.createElement(tag)
        if (className) {
			if(className.includes(" ")) {
				let classNames = className.replace(/  */, " ").split(" ")
				el.className = ""
				classNames.forEach((c) => el.classList.add(c))
			} else el.className = className
		}
		if(id) el.id = id
        if (text) el.innerText = text
        if(append) parent.appendChild(el)
		else parent.prepend(el)
        return el
    }

    addBtn(text, id, handler, parent) {
        const btn = this.addElement('button', null, id, text, parent)
        if(handler) btn.addEventListener('click', handler)
		return btn
    }

    addEventListeners() {
        document.addEventListener('keyup', this.handleGlobalKeyPress.bind(this))
		window.addEventListener('message', (event) => {
			const word = event.data
			if(word === 'X') this.resetGame()
			else this.enterWord(word)
		})
            window.addEventListener('resize', this.fitToViewport.bind(this))
            window.addEventListener('orientationchange', this.fitToViewport.bind(this))
	}

        fitToViewport() {
            if (!this.container) return

            const baseWidth = this.container.offsetWidth
            const baseHeight = this.container.offsetHeight
            if (!baseWidth || !baseHeight) return

            const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight)
            const offsetX = (window.innerWidth - (baseWidth * scale)) / 2
            const offsetY = (window.innerHeight - (baseHeight * scale)) / 2

            this.container.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`
        }

    handleGlobalKeyPress(event) {
        if (this.finished) return

        const letter = event.key.toUpperCase()
        if (letter.length === 1 && /^[A-Z]$/.test(letter)) {
            this.handleKeyPress(letter)
        } else if (event.key === 'Enter') {
            this.submitWord()
        } else if (event.key === 'Backspace') {
            this.deleteLetter()
        }
    }

    handleKeyPress(letter) {
        if (this.finished) return
        const wordRow = document.getElementsByClassName('row')[this.currentRow]
        this.addLetter(wordRow, letter)
    }

	colorizeKey(char, className) {
		if(className == 'absent') return
		const key = document.getElementById(`keyboard_${char}`)
		const isCorrect = key.classList.contains('correct')
		if(className === 'correct' && !isCorrect) {
			key.classList.remove('present')
			key.classList.add(className)
		} else if(className === 'present' && !isCorrect && !key.classList.contains('present')) {
			key.classList.add(className)
		}
	}

    submitWord() {
        const currentRowBlocks = document.getElementsByClassName('row')[this.currentRow].getElementsByClassName('row_block')
        let wordGuessed = ''
        for (const block of currentRowBlocks) {
            wordGuessed += block.innerText
        }

		if(wordGuessed.length != 5) {
			notification.innerText = 'You must enter 5 characters'
			return
		}

		let encodedAnswer = ''
        for (let i = 0; i < 5; i++) {
			const letter = this.chosenWord[i]
			const guessedLetter = wordGuessed[i]
			let className = 'absent'
            if (letter === wordGuessed[i]) {
                className = 'correct'
				encodedAnswer += guessedLetter
            } else if (this.chosenWord.includes(guessedLetter)) {
                className = 'present'
				encodedAnswer += guessedLetter.toLowerCase()
            } else encodedAnswer += '_'

			currentRowBlocks[i].classList.add(className)
			this.colorizeKey(guessedLetter, className)
        }

        if (wordGuessed === this.chosenWord) {
            this.notification.innerText = "Correct! You've guessed the word."
            this.finished = true
            return
        }

        if (this.currentRow === 5) {
            this.finished = true
            this.notification.innerText = `You failed to guess the word. It was ${this.chosenWord}`
            return
        }

		console.log(wordGuessed+": "+encodedAnswer)

		if(window.solveWindow && !(window.solveWindow.closed))
			window.solveWindow.postMessage(encodedAnswer, '*') 
		else if(navigator.clipboard)
			navigator.clipboard.writeText(encodedAnswer)

		this.notification.innerText = `You have ${5-this.currentRow} attempt${5-this.currentRow>1?'s':''} left.`
        this.currentRow++
    }

	enterWord(word) {
		if(this.finished) return
		let text = word.split('')
		let wordRow = document.getElementsByClassName('row')[this.currentRow]
		for (let i in text) this.deleteLetter()
		for (let letter of text) this.addLetter(wordRow, letter)
		this.submitWord()
	}

    deleteLetter() {
        const wordRow = document.getElementsByClassName('row')[this.currentRow]
        const currentRowBlocks = wordRow.getElementsByClassName('row_block')

        for (let i = 4; i >= 0; i--) {
            if (currentRowBlocks[i].innerText !== '') {
                currentRowBlocks[i].innerText = ''
                break
            }
        }
    }

    addLetter(wordRow, letter) {
        const blocks = wordRow.getElementsByClassName('row_block')
        for (const block of blocks) {
            if (!block.innerText) {
                block.innerText = letter
                break
            }
        }
    }

    solve() {
		if(!window.solveWindow || window.solveWindow.closed) {
			window.solveWindow = window.open('solver.html', 'solverWindow', 'width=800,height=400')
		}
    }

    quit() {
        this.notification.innerText = `You gave up! The word was ${this.chosenWord}`
        this.finished = true
    }
}

new WordledGame()
