import { Bean } from '@/ioc'

@Bean()
export default class FakeService {
	test() {
		console.log('fakeService testing');
	}
}