# CSR vs SSR Detector

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fhiopdjeekafnhmfbcfoolhejdgjpkgg)](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg)

The **CSR vs SSR Detector** is a Chrome extension that allows users to identify whether a webpage is rendered using Client-Side Rendering (CSR) or Server-Side Rendering (SSR). Understanding this distinction is essential for making informed decisions about SEO, page performance, and overall application architecture.

## Features

- **SEO Insights**: Helps developers and SEO specialists determine the rendering method to ensure pages are optimized for search engine crawlers.
- **Performance Analysis**: Quickly determine rendering strategies to optimize load times and user experience.
- **Developer-Friendly**: Offers immediate results without the need to dig through the code.

## How It Works

The extension analyzes the content of the page to detect if it was rendered on the server or by the client. It then provides this information in a clear, easily accessible format within your Chrome browser.

## Sequence Diagram

![Sequence Diagram](sequence_diagram.png)

## Installation

1. Download the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg).
2. Open a website you want to analyze.
3. Click on the extension icon to see if the page is rendered using CSR or SSR.

## Contributing

I am seeking help to improve the **CSR vs SSR Detector** further. Enhancements could include:

- Improving the detection accuracy for more complex frameworks
- Adding support for additional rendering techniques
- Implementing a user-friendly interface with more detailed feedback

### Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/dzienisz/chrome-ssr-csr.git
2.	Open the Chrome Extensions page (chrome://extensions).
3. Enable **Developer Mode**.
4. Click on **Load unpacked** and select the project directory.

## How to Contribute

Feel free to submit pull requests or create issues for any improvements or suggestions. If you need help with setting up or understanding the code, please don’t hesitate to reach out.

## Feedback

Your feedback is invaluable! Please leave any suggestions, feature requests, or bug reports in the [GitHub Issues](https://github.com/dzienisz/chrome-ssr-csr/issues) section.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
