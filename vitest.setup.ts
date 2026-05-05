import "@testing-library/jest-dom/vitest";

class IntersectionObserverMock {
	observe() {}

	unobserve() {}

	disconnect() {}

	takeRecords() {
		return [];
	}
}

Object.defineProperty(globalThis, "IntersectionObserver", {
	configurable: true,
	writable: true,
	value: IntersectionObserverMock,
});

Object.defineProperty(window, "scrollTo", {
	configurable: true,
	writable: true,
	value: () => {},
});