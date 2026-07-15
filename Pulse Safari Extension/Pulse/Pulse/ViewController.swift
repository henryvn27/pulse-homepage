//
//  ViewController.swift
//  Pulse
//
//  Created by Henry Van Ness on 7/14/26.
//

import Cocoa
import SafariServices
import WebKit

private let extensionBundleIdentifier = "com.henry.Pulse.Extension"

private enum PulseColors {
    static let canvas = adaptive(light: 0xEEEAE2, dark: 0x171816)
    static let surface = adaptive(light: 0xF7F5EF, dark: 0x20211F)
    static let surfaceStrong = adaptive(light: 0xFFFEF9, dark: 0x272825)
    static let text = adaptive(light: 0x20211F, dark: 0xF3F1EB)
    static let muted = adaptive(light: 0x73756F, dark: 0xA8AAA3)
    static let line = adaptive(light: 0xD8D5CE, dark: 0x3C3D3A)
    static let accent = NSColor(red: 0.91, green: 0.33, blue: 0.25, alpha: 1)
    static let accentSoft = adaptive(light: 0xF8D9D1, dark: 0x472821)
    static let green = adaptive(light: 0x257D72, dark: 0x3A9A8C)
    static let warning = adaptive(light: 0xB27916, dark: 0xE0A944)

    private static func adaptive(light: Int, dark: Int) -> NSColor {
        NSColor(name: nil) { appearance in
            let value = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark : light
            return NSColor(
                red: CGFloat((value >> 16) & 0xFF) / 255,
                green: CGFloat((value >> 8) & 0xFF) / 255,
                blue: CGFloat(value & 0xFF) / 255,
                alpha: 1
            )
        }
    }
}

private final class PulseBackgroundView: NSView {
    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = PulseColors.canvas.cgColor
    }
}

private final class PulsePanelView: NSView {
    private let fill: NSColor
    private let radius: CGFloat

    init(fill: NSColor = PulseColors.surface, radius: CGFloat = 14) {
        self.fill = fill
        self.radius = radius
        super.init(frame: .zero)
    }

    required init?(coder: NSCoder) { nil }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = fill.cgColor
        layer?.borderColor = PulseColors.line.cgColor
        layer?.borderWidth = 1
        layer?.cornerRadius = radius
    }
}

private final class StatusDotView: NSView {
    enum State { case checking, enabled, disabled }
    var state: State = .checking { didSet { needsDisplay = true } }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        let color: NSColor
        switch state {
        case .checking: color = PulseColors.warning
        case .enabled: color = PulseColors.green
        case .disabled: color = PulseColors.accent
        }
        layer?.backgroundColor = color.cgColor
        layer?.cornerRadius = 4
    }
}

final class ViewController: NSViewController {
    @IBOutlet private var webView: WKWebView!

    private let statusLabel = ViewController.label("Checking extension…", size: 11, weight: .semibold, color: PulseColors.muted)
    private let stateLabel = ViewController.label("Checking whether Pulse is enabled…", size: 12, weight: .regular, color: PulseColors.muted)
    private let statusDot = StatusDotView()
    private lazy var primaryButton = makeButton("Open Safari", action: #selector(primaryAction), primary: true)
    private var extensionEnabled: Bool?

    override func viewDidLoad() {
        super.viewDidLoad()
        buildInterface()
        refreshExtensionState()
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        view.window?.setContentSize(NSSize(width: 620, height: 440))
        view.window?.minSize = NSSize(width: 560, height: 400)
        view.window?.center()
    }

    private func buildInterface() {
        webView.removeFromSuperview()

        let background = PulseBackgroundView(frame: .zero)
        background.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(background)

        let stack = NSStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.distribution = .fill
        stack.spacing = 16
        background.addSubview(stack)

        let sections: [(NSView, CGFloat)] = [
            (makeHeader(), 48),
            (makeIntro(), 80),
            (makeExtensionCard(), 64),
            (makeAddressCard(), 60),
            (makeConnectionNote(), 16),
            (makeActions(), 42),
        ]

        for (section, height) in sections {
            section.translatesAutoresizingMaskIntoConstraints = false
            stack.addArrangedSubview(section)
            NSLayoutConstraint.activate([
                section.widthAnchor.constraint(equalTo: stack.widthAnchor),
                section.heightAnchor.constraint(equalToConstant: height),
            ])
        }

        NSLayoutConstraint.activate([
            background.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            background.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            background.topAnchor.constraint(equalTo: view.topAnchor),
            background.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            stack.leadingAnchor.constraint(equalTo: background.leadingAnchor, constant: 30),
            stack.trailingAnchor.constraint(equalTo: background.trailingAnchor, constant: -30),
            stack.topAnchor.constraint(equalTo: background.topAnchor, constant: 25),
            stack.bottomAnchor.constraint(equalTo: background.bottomAnchor, constant: -25),
        ])
    }

    private func makeHeader() -> NSView {
        let container = NSView()

        let icon = NSImageView()
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.imageScaling = .scaleProportionallyUpOrDown
        if let iconURL = Bundle.main.url(forResource: "Icon", withExtension: "png") {
            icon.image = NSImage(contentsOf: iconURL)
        }

        let eyebrow = Self.label("SAFARI HOMEPAGE", size: 11, weight: .bold, color: PulseColors.muted)
        let name = Self.label("Pulse", size: 24, weight: .bold, color: PulseColors.text)
        let brand = verticalStack([eyebrow, name], spacing: 1)

        let pill = PulsePanelView(radius: 16)
        pill.translatesAutoresizingMaskIntoConstraints = false
        statusDot.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        pill.addSubview(statusDot)
        pill.addSubview(statusLabel)

        container.addSubview(icon)
        container.addSubview(brand)
        container.addSubview(pill)

        NSLayoutConstraint.activate([
            icon.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            icon.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 48),
            icon.heightAnchor.constraint(equalToConstant: 48),
            brand.leadingAnchor.constraint(equalTo: icon.trailingAnchor, constant: 12),
            brand.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            pill.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            pill.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            pill.heightAnchor.constraint(equalToConstant: 32),
            statusDot.leadingAnchor.constraint(equalTo: pill.leadingAnchor, constant: 11),
            statusDot.centerYAnchor.constraint(equalTo: pill.centerYAnchor),
            statusDot.widthAnchor.constraint(equalToConstant: 8),
            statusDot.heightAnchor.constraint(equalToConstant: 8),
            statusLabel.leadingAnchor.constraint(equalTo: statusDot.trailingAnchor, constant: 7),
            statusLabel.trailingAnchor.constraint(equalTo: pill.trailingAnchor, constant: -11),
            statusLabel.centerYAnchor.constraint(equalTo: pill.centerYAnchor),
        ])
        return container
    }

    private func makeIntro() -> NSView {
        let title = Self.label("Your day, ready when Safari opens.", size: 30, weight: .bold, color: PulseColors.text)
        title.maximumNumberOfLines = 1
        let subtitle = Self.label("See current work, your calendar, reminders, weather, and shortcuts\nin one calm place.", size: 14, weight: .regular, color: PulseColors.muted)
        subtitle.maximumNumberOfLines = 2
        return verticalStack([title, subtitle], spacing: 8)
    }

    private func makeExtensionCard() -> NSView {
        let card = PulsePanelView()
        let step = PulsePanelView(fill: PulseColors.accentSoft, radius: 10)
        step.translatesAutoresizingMaskIntoConstraints = false
        let number = Self.label("1", size: 13, weight: .bold, color: PulseColors.accent)
        number.translatesAutoresizingMaskIntoConstraints = false
        step.addSubview(number)

        let title = Self.label("Safari extension", size: 14, weight: .bold, color: PulseColors.text)
        let copy = verticalStack([title, stateLabel], spacing: 4)
        card.addSubview(step)
        card.addSubview(copy)

        NSLayoutConstraint.activate([
            step.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            step.centerYAnchor.constraint(equalTo: card.centerYAnchor),
            step.widthAnchor.constraint(equalToConstant: 34),
            step.heightAnchor.constraint(equalToConstant: 34),
            number.centerXAnchor.constraint(equalTo: step.centerXAnchor),
            number.centerYAnchor.constraint(equalTo: step.centerYAnchor),
            copy.leadingAnchor.constraint(equalTo: step.trailingAnchor, constant: 12),
            copy.trailingAnchor.constraint(lessThanOrEqualTo: card.trailingAnchor, constant: -14),
            copy.centerYAnchor.constraint(equalTo: card.centerYAnchor),
        ])
        return card
    }

    private func makeAddressCard() -> NSView {
        let card = PulsePanelView(fill: PulseColors.surfaceStrong)
        let title = Self.label("NEW TAB PAGE", size: 11, weight: .bold, color: PulseColors.muted)
        let detail = Self.label("Pulse opens automatically in every new Safari tab.", size: 12, weight: .regular, color: PulseColors.text)
        let copy = verticalStack([title, detail], spacing: 4)

        card.addSubview(copy)
        NSLayoutConstraint.activate([
            copy.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            copy.centerYAnchor.constraint(equalTo: card.centerYAnchor),
            copy.trailingAnchor.constraint(lessThanOrEqualTo: card.trailingAnchor, constant: -14),
        ])
        return card
    }

    private func makeConnectionNote() -> NSView {
        let label = Self.label("Pulse stays local. No server or background process is required.", size: 11, weight: .regular, color: PulseColors.muted)
        let container = NSView()
        label.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            label.centerYAnchor.constraint(equalTo: container.centerYAnchor),
        ])
        return container
    }

    private func makeActions() -> NSView {
        let container = NSView()
        let settings = makeButton("Safari Settings", action: #selector(openSafariSettings), primary: false)
        container.addSubview(primaryButton)
        container.addSubview(settings)
        NSLayoutConstraint.activate([
            primaryButton.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            primaryButton.topAnchor.constraint(equalTo: container.topAnchor),
            primaryButton.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            primaryButton.widthAnchor.constraint(equalToConstant: 190),
            settings.leadingAnchor.constraint(equalTo: primaryButton.trailingAnchor, constant: 10),
            settings.topAnchor.constraint(equalTo: container.topAnchor),
            settings.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            settings.widthAnchor.constraint(equalToConstant: 130),
        ])
        return container
    }

    private func refreshExtensionState() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { [weak self] state, error in
            DispatchQueue.main.async {
                guard let self else { return }
                guard let state, error == nil else {
                    self.applyExtensionState(nil)
                    return
                }
                self.applyExtensionState(state.isEnabled)
            }
        }
    }

    private func applyExtensionState(_ enabled: Bool?) {
        extensionEnabled = enabled
        switch enabled {
        case true:
            statusDot.state = .enabled
            statusLabel.stringValue = "Extension on"
            stateLabel.stringValue = "Pulse is enabled. Open a new Safari tab to see your dashboard."
            setPrimaryButtonTitle("Open Safari")
        case false:
            statusDot.state = .disabled
            statusLabel.stringValue = "Extension off"
            stateLabel.stringValue = "Enable Pulse in Safari Settings to use it on new tabs."
            setPrimaryButtonTitle("Enable in Safari")
        case nil:
            statusDot.state = .checking
            statusLabel.stringValue = "Check extension"
            stateLabel.stringValue = "Open Safari Settings to confirm Pulse is enabled."
            setPrimaryButtonTitle("Open Safari")
        }
    }

    @objc private func primaryAction() {
        extensionEnabled == false ? openSafariSettings() : openSafari()
    }

    @objc private func openSafariSettings() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier)
    }

    private func openSafari() {
        guard let safariURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.apple.Safari") else {
            NSSound.beep()
            return
        }
        NSWorkspace.shared.openApplication(at: safariURL, configuration: NSWorkspace.OpenConfiguration())
    }

    private func makeButton(_ title: String, action: Selector, primary: Bool) -> NSButton {
        let button = NSButton(title: title, target: self, action: action)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.bezelStyle = .rounded
        button.controlSize = .large
        button.font = NSFont.systemFont(ofSize: 13, weight: .bold)
        if primary {
            button.bezelColor = PulseColors.accent
            button.contentTintColor = .white
            button.attributedTitle = NSAttributedString(
                string: title,
                attributes: [
                    .font: NSFont.systemFont(ofSize: 13, weight: .bold),
                    .foregroundColor: NSColor.white,
                ]
            )
        }
        return button
    }

    private func setPrimaryButtonTitle(_ title: String) {
        primaryButton.title = title
        primaryButton.attributedTitle = NSAttributedString(
            string: title,
            attributes: [
                .font: NSFont.systemFont(ofSize: 13, weight: .bold),
                .foregroundColor: NSColor.white,
            ]
        )
    }

    private func verticalStack(_ views: [NSView], spacing: CGFloat) -> NSStackView {
        let stack = NSStackView(views: views)
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.distribution = .fill
        stack.spacing = spacing
        return stack
    }

    private static func label(_ text: String, size: CGFloat, weight: NSFont.Weight, color: NSColor) -> NSTextField {
        let label = NSTextField(labelWithString: text)
        label.font = NSFont.systemFont(ofSize: size, weight: weight)
        label.textColor = color
        label.maximumNumberOfLines = 1
        return label
    }
}
