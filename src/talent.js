import { clone, weightRandom } from './functions/util.js';
import { checkCondition, extractMaxTriggers } from './functions/condition.js';
import { getRate } from './functions/addition.js';

class Talent {
    constructor() { }

    #talents;

    initial({ talents }) {
        this.#talents = talents;
        for (const id in talents) {
            const talent = talents[id];
            talent.id = Number(id);
            talent.grade = Number(talent.grade);
            talent.max_triggers = extractMaxTriggers(talent.condition);
            if (talent.replacement) {
                for (let key in talent.replacement) {
                    const obj = {};
                    for (let value of talent.replacement[key]) {
                        value = `${value}`.split('*');
                        obj[value[0] || 0] = Number(value[1]) || 1;
                    }
                    talent.replacement[key] = obj;
                }
            }
        }
    }

    count() {
        return Object.keys(this.#talents).length;
    }

    check(talentId, property) {
        const { condition } = this.get(talentId);
        return checkCondition(property, condition);
    }

    get(talentId) {
        const talent = this.#talents[talentId];
        if (!talent) throw new Error(`[ERROR] No Talent[${talentId}]`);
        return clone(talent);
    }

    information(talentId) {
        const { grade, name, description } = this.get(talentId)
        return { grade, name, description };
    }

    exclusive(talends, exclusiveId) {
        const { exclusive } = this.get(exclusiveId);
        if (!exclusive) return null;
        for (const talent of talends) {
            for (const e of exclusive) {
                if (talent == e) return talent;
            }
        }
        return null;
    }

    talentRandom(include, { times = 0, achievement = 0 } = {}) {
        const rate = { 1: 100, 2: 10, 3: 1, };
        const rateAddition = { 1: 1, 2: 1, 3: 1, };
        const timesRate = getRate('times', times);
        const achievementRate = getRate('achievement', achievement);
        const specialTalentedId = 1048;

        for (const grade in timesRate)
            rateAddition[grade] += timesRate[grade] - 1;

        for (const grade in achievementRate)
            rateAddition[grade] += achievementRate[grade] - 1;

        for (const grade in rateAddition)
            rate[grade] *= rateAddition[grade];

        const randomGrade = () => {
            let randomNumber = Math.floor(Math.random() * 1000);
            if ((randomNumber -= rate[3]) < 0) return 3;
            if ((randomNumber -= rate[2]) < 0) return 2;
            if ((randomNumber -= rate[1]) < 0) return 1;
            return 0;
        }

        // 1000, 100, 10, 1
        const talentList = {};
        for (const talentId in this.#talents) {
            const { id, grade, name, description } = this.#talents[talentId];
            if (id == include) {
                include = { grade, name, description, id };
                continue;
            }
            if (!talentList[grade]) talentList[grade] = [{ grade, name, description, id }];
            else talentList[grade].push({ grade, name, description, id });
        }

        const randomTalent = (grade) => {
            while (talentList[grade].length == 0) grade--;
            const length = talentList[grade].length;

            const random = Math.floor(Math.random() * length) % length;
            const talent = talentList[grade].splice(random, 1)[0];
            console.log(talent);
            return talent;
        }

        const bingoTalent = () => {
            const talents = [];
            let randomNumber = Math.floor(Math.random() * 1000);
            //let randomNumber = 7;
            console.log(`You've got a bingo number ${randomNumber}`);
            const bingoFactor = 2;
            if ((randomNumber % 5) === bingoFactor) {
                console.log("You bingo an enlightenment talent");
                let i = talentList[3].findIndex(e => e.id === specialTalentedId);
                talents.push(i > -1 ? talentList[3].splice(i, 1)[0] : this.#talents[specialTalentedId]);
            } else {
                let grade = randomGrade();
                console.log(`You bingo a ${grade} level talent, good luck next time`);
                talents.push(randomTalent(grade));
            }
            if (include && talents[0].id !== include.id) {
                console.log(`Inherit talent:${include}`);
                talents.push(include);
            } else {
                talents.push(randomTalent(randomGrade()));
            }
            console.log(talents);
            return talents;
        }

        const shuffle = function (array) {
            let currentIndex = array.length, randomIndex;

            // While there remain elements to shuffle...
            while (currentIndex != 0) {

                // Pick a remaining element...
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;

                // And swap it with the current element.
                [array[currentIndex], array[randomIndex]] = [
                    array[randomIndex], array[currentIndex]];
            }
            return array;
        }

        return shuffle(
            bingoTalent().concat(
                [3, 3, 2, 2, 2].concat(new Array(13).fill(1))
                    .map((v, i) => {
                        let grade = i > 8 ? randomGrade() : v;
                        console.log(`${i} : You've picked a ${grade} level talent`);
                        return randomTalent(grade);
                    }))
        );
    }

    allocationAddition(talents) {
        if (Array.isArray(talents)) {
            let addition = 0;
            for (const talent of talents)
                addition += this.allocationAddition(talent);
            return addition;
        }
        return Number(this.get(talents).status) || 0;
    }

    do(talentId, property) {
        const { effect, condition, grade, name, description } = this.get(talentId);
        if (condition && !checkCondition(property, condition))
            return null;
        return { effect, grade, name, description };
    }

    replace(talents) {
        const getReplaceList = (talent, talents) => {
            const { replacement } = this.get(talent);
            if (!replacement) return null;
            const list = [];
            if (replacement.grade) {
                this.forEach(({ id, grade }) => {
                    if (!replacement.grade[grade]) return;
                    if (this.exclusive(talents, id)) return;
                    list.push([id, replacement.grade[grade]]);
                })
            }
            if (replacement.talent) {
                for (let id in replacement.talent) {
                    id = Number(id);
                    if (this.exclusive(talents, id)) continue;
                    list.push([id, replacement.talent[id]]);
                }
            }
            return list;
        }

        const replace = (talent, talents) => {
            const replaceList = getReplaceList(talent, talents);
            if (!replaceList) return talent;
            const rand = weightRandom(replaceList);
            return replace(
                rand, talents.concat(rand)
            );
        }

        const newTalents = clone(talents);
        const result = {};
        for (const talent of talents) {
            const replaceId = replace(talent, newTalents);
            if (replaceId != talent) {
                result[talent] = replaceId;
                newTalents.push(replaceId);
            }
        }
        return result;
    }

    forEach(callback) {
        if (typeof callback != 'function') return;
        for (const id in this.#talents)
            callback(clone(this.#talents[id]), id);
    }

}

export default Talent;